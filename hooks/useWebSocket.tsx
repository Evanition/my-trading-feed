import { useState, useEffect, useRef, useCallback } from 'react';
import { Trade } from '../types/trade'; 

interface WebSocketState {
  isConnected: boolean;
  trades: Trade[];
  error: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
  clearTrades: () => void;
  newlyArrivedTradeIds: Set<string>;
}

export const useWebSocket = (): WebSocketState => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const lastPricesRef = useRef<Map<string, number>>(new Map());
  const [newlyArrivedTradeIds, setNewlyArrivedTradeIds] = useState<Set<string>>(new Set());
  const highlightTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setTrades([]);
    lastPricesRef.current.clear();
    currentUrlRef.current = null;
    highlightTimersRef.current.forEach(timer => clearTimeout(timer));
    highlightTimersRef.current.clear();
    setNewlyArrivedTradeIds(new Set());
  }, []);

  const connect = useCallback((url: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      disconnect();
    }
    if (!url) {
      setError('WebSocket URL cannot be empty.');
      return;
    }

    setError(null);
    setIsConnected(false);
    currentUrlRef.current = url;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected:', url);
      };

      ws.onmessage = (event) => {
        try {
          const rawTrade: Trade = JSON.parse(event.data);

          if (!rawTrade.id || !rawTrade.symbol || typeof rawTrade.price !== 'number') {
            console.warn('Received malformed trade data:', rawTrade);
            return;
          }

          let priceChangeDirection: 'up' | 'down' | 'same' = 'same';
          const prevPrice = lastPricesRef.current.get(rawTrade.symbol);
          if (prevPrice !== undefined) {
            if (rawTrade.price > prevPrice) {
              priceChangeDirection = 'up';
            } else if (rawTrade.price < prevPrice) {
              priceChangeDirection = 'down';
            }
          }
          lastPricesRef.current.set(rawTrade.symbol, rawTrade.price);

          const tradeWithMetadata: Trade = {
            ...rawTrade,
            priceChangeDirection,
          };

          setTrades((prevTrades) => {
            const maxTrades = 500; 
            const updatedTrades = [tradeWithMetadata, ...prevTrades];
            if (updatedTrades.length > maxTrades) {
                updatedTrades.slice(maxTrades).forEach(t => {
                    const timer = highlightTimersRef.current.get(t.id);
                    if (timer) {
                        clearTimeout(timer);
                        highlightTimersRef.current.delete(t.id);
                    }
                });
            }
            return updatedTrades.slice(0, maxTrades);
          });

          setNewlyArrivedTradeIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(tradeWithMetadata.id);

            const timer = setTimeout(() => {
                setNewlyArrivedTradeIds((current) => {
                    const updatedCurrent = new Set(current);
                    updatedCurrent.delete(tradeWithMetadata.id);
                    return updatedCurrent;
                });
                highlightTimersRef.current.delete(tradeWithMetadata.id);
            }, 1500);
            highlightTimersRef.current.set(tradeWithMetadata.id, timer);

            return newSet;
          });

        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', event.data, parseError);
          setError('Error parsing message: Invalid JSON format.');
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error. Check console for details.');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        if (!event.wasClean && event.code !== 1000) {
          setError(`WebSocket connection unexpectedly closed (Code: ${event.code}).`);
        }
      };

      wsRef.current = ws;

    } catch (e: any) {
      setError(`Failed to connect: ${e.message}`);
      setIsConnected(false);
    }
  }, [disconnect]);

  const clearTrades = useCallback(() => {
    setTrades([]);
    lastPricesRef.current.clear();
    highlightTimersRef.current.forEach(timer => clearTimeout(timer));
    highlightTimersRef.current.clear();
    setNewlyArrivedTradeIds(new Set());
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      highlightTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return { isConnected, trades, error, connect, disconnect, clearTrades, newlyArrivedTradeIds };
};