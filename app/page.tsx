'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Trade } from '../types/trade';
import Toast from '../components/Toast';

export default function HomePage() {
  const [urlInput, setUrlInput] = useState<string>('');
  useEffect(() => {
    const savedUrl = localStorage.getItem('lastWsUrl');
    if (savedUrl) {
      setUrlInput(savedUrl);
    } else {
      setUrlInput('ws://localhost:8080');
    }
  }, []);

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrlInput(newUrl);
    localStorage.setItem('lastWsUrl', newUrl);
  };

  const {
    isConnected,
    trades,
    error,
    connect,
    disconnect,
    clearTrades,
    newlyArrivedTradeIds
  } = useWebSocket();

  const [filterTerm, setFilterTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof Trade>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [toastDuration, setToastDuration] = useState<number | undefined>(undefined);
  const [toastId, setToastId] = useState(0); 

  // Modified showToast to accept an optional duration and increment toastId
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
    setToastMessage(message);
    setToastType(type);
    setToastDuration(duration);
    setToastId(prevId => prevId + 1); // NEW: Increment ID to force Toast re-mount
  }, []);

  // Use refs to track previous connection states to trigger toasts only on 
  const prevIsConnectedRef = useRef(isConnected);
  const prevErrorRef = useRef(error);

  useEffect(() => {
    if (!prevIsConnectedRef.current && isConnected) {
      showToast(`Connected to ${urlInput}`, 'success', 899); // a little janky because use effect runs after render, but works for this case
    }
    else if (prevIsConnectedRef.current && !isConnected && !error) {
      showToast('Disconnected.', 'info');
    }
      
    else if (error && error !== prevErrorRef.current) {
      showToast(error, 'error');
    }

    prevIsConnectedRef.current = isConnected;
    prevErrorRef.current = error;
  }, [isConnected, error, showToast, urlInput]); 


  const handleConnect = () => {
    connect(urlInput);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
  };

  const getTradeSearchableString = useCallback((trade: Trade): string => {
    const formattedTimestamp = formatTimestamp(trade.timestamp);
    const formattedPrice = trade.price.toFixed(2);
    const formattedSize = trade.size.toFixed(4);

    return [
      formattedTimestamp,
      trade.symbol,
      formattedPrice,
      formattedSize,
      trade.side,
      trade.exchange,
      trade.id
    ].map(String).join(' ').toLowerCase();
  }, []);

  const filteredTrades = useMemo(() => {
    if (!filterTerm) {
      return trades;
    }
    const lowerCaseFilter = filterTerm.toLowerCase();
    return trades.filter(trade =>
      getTradeSearchableString(trade).includes(lowerCaseFilter)
    );
  }, [trades, filterTerm, getTradeSearchableString]);

  const sortedAndFilteredTrades = useMemo(() => {
    if (!sortBy) {
      return filteredTrades;
    }

    const sorted = [...filteredTrades].sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });

    return sorted;
  }, [filteredTrades, sortBy, sortDirection]);

  const handleSort = (column: keyof Trade) => {
    if (sortBy === column) {
      setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (column: keyof Trade) => {
    if (sortBy === column) {
      return (
        <span className="ml-1 font-bold text-blue-300">
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      );
    }
    return null;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [tradesPerPage, setTradesPerPage] = useState(25);
  const totalPages = useMemo(() => Math.ceil(sortedAndFilteredTrades.length / tradesPerPage), [sortedAndFilteredTrades.length, tradesPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTerm, sortBy, sortDirection]);

  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTradesPaginated = useMemo(() => sortedAndFilteredTrades.slice(indexOfFirstTrade, indexOfLastTrade), [sortedAndFilteredTrades, indexOfFirstTrade, indexOfLastTrade]);

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageNumbersToShow = 5;

    if (totalPages <= maxPageNumbersToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbersToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPageNumbersToShow - 1);

      if (endPage - startPage + 1 < maxPageNumbersToShow) {
        startPage = Math.max(1, endPage - maxPageNumbersToShow + 1);
      }

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: tableContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const showScrollButtons = sortedAndFilteredTrades.length > tradesPerPage;

  const isConnecting = !isConnected && !error && urlInput;

  return (
    <div className="container mx-auto p-4 max-w-5xl relative min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-center text-teal-400 drop-shadow-lg">
        Live Trading Feed
      </h1>

      <div className="mb-6 bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 mb-5 items-center">
          <input
            type="text"
            placeholder="Enter WebSocket URL (e.g., ws://localhost:8080)"
            value={urlInput}
            onChange={handleUrlInputChange}
            className="flex-grow p-3.5 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-inner"
          />
          <button
            onClick={handleConnect}
            disabled={isConnected || !urlInput}
            className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            {isConnected ? 'Connected' : 'Connect'}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={!isConnected}
            className="px-6 py-3 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Disconnect
          </button>
          <button
            onClick={clearTrades}
            disabled={trades.length === 0}
            className="px-6 py-3 rounded-lg bg-indigo-700 text-white font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Clear Trades
          </button>
        </div>

        {/* Global Filter Input */}
        <div className="relative mb-5">
            <input
                type="text"
                placeholder="Filter trades (e.g., BTC/USD, Binance, buy, 1000.00)"
                value={filterTerm}
                onChange={(e) => {setFilterTerm(e.target.value); setCurrentPage(1);}}
                className="w-full p-3.5 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10 text-sm shadow-inner"
            />
            {filterTerm && (
                <button
                    onClick={() => {setFilterTerm(''); setCurrentPage(1);}}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors duration-200 text-lg"
                    title="Clear filter"
                >
                    ×
                </button>
            )}
        </div>

        {/* Connection Status Visuals & Spinner */}
        <p className={`text-md font-medium flex items-center gap-3 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
          <span
            className={`w-3.5 h-3.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : (isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-rose-500')
            } ${isConnecting ? 'flex items-center justify-center' : ''}`}
          >
            {isConnecting && (
                <span className="text-xs text-black animate-spin">⟳</span>
            )}
          </span>
          Status: {isConnected ? 'Connected' : (isConnecting ? 'Connecting...' : 'Disconnected')}
        </p>
        {error && (
          <p className="text-red-500 text-sm mt-3 font-semibold bg-red-900 bg-opacity-30 p-2 rounded-md border border-red-700">
            Error: {error}
          </p>
        )}
      </div>

      <div ref={tableContainerRef} className="overflow-y-auto bg-gray-900 rounded-xl shadow-lg border border-gray-700 max-h-[70vh] relative">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              {([
                { key: 'timestamp', label: 'Time' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'price', label: 'Price' },
                { key: 'size', label: 'Size' },
                { key: 'side', label: 'Side' },
                { key: 'exchange', label: 'Exchange' },
              ] as { key: keyof Trade; label: string }[]).map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="cursor-pointer px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider select-none hover:bg-gray-700 transition-colors duration-200"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {renderSortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {currentTradesPaginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-400 text-md">
                  {isConnected ?
                    (filterTerm ? 'No trades matching your filter on this page.' : 'Waiting for trades...') :
                    'Connect to a WebSocket to see trades.'
                  }
                </td>
              </tr>
            ) : (
              currentTradesPaginated.map((trade) => (
                <tr
                  key={trade.id}
                  className={`hover:bg-gray-800 transition-colors duration-150 ${
                    newlyArrivedTradeIds.has(trade.id) ? 'animate-highlight-row' : ''
                  }`}
                >
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-300">{formatTimestamp(trade.timestamp)}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-amber-300">{trade.symbol}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-200 flex items-center gap-1">
                    ${trade.price.toFixed(2)}
                    {/* Price Change Indicator */}
                    {trade.priceChangeDirection === 'up' && <span className="text-emerald-400 text-lg font-bold">▲</span>}
                    {trade.priceChangeDirection === 'down' && <span className="text-rose-400 text-lg font-bold">▼</span>}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-300">{trade.size.toFixed(4)}</td>
                  <td className={`px-6 py-3.5 whitespace-nowrap text-sm font-bold ${trade.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trade.side.toUpperCase()}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-300">{trade.exchange}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Scroll Buttons */}
      {showScrollButtons && (
        <div className="mt-6 flex justify-center gap-4 transition-opacity duration-300">
            <button
                onClick={scrollToTop}
                className="px-5 py-2.5 rounded-lg bg-sky-700 text-white text-sm font-medium hover:bg-sky-600 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
                Scroll to Top
            </button>
            <button
                onClick={scrollToBottom}
                className="px-5 py-2.5 rounded-lg bg-sky-700 text-white text-sm font-medium hover:bg-sky-600 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
                Scroll to Bottom
            </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2 text-white">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Previous
          </button>

          {renderPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {typeof page === 'number' ? (
                <button
                  onClick={() => paginate(page)}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  } transition-colors duration-200`}
                >
                  {page}
                </button>
              ) : (
                <span className="px-2 py-2 text-gray-400">...</span>
              )}
            </React.Fragment>
          ))}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next
          </button>
          <span className="ml-4 text-gray-400 text-sm">Page {currentPage} of {totalPages}</span>
        </div>
      )}

      {/* Toast Notification with dynamic key */}
      <Toast
        key={toastId}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
        duration={toastDuration}
      />
    </div>
  );
}