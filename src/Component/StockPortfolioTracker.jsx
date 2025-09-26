import React, { useState, useEffect, useMemo } from 'react';
import { Upload, TrendingUp, TrendingDown, PieChart, BarChart3, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const getMostRecentPrice = (symbol, trades) => {
  const symbolTrades = trades
    .filter(trade => trade.symbol === symbol)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return symbolTrades.length > 0 ? symbolTrades[0].price : 0;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7300', '#00FF00', '#FF00FF'];

const StockPortfolioTracker = () => {
  const [trades, setTrades] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const itemsPerPage = 10;

  // Parse CSV data
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const expectedHeaders = ['symbol', 'shares', 'price', 'date'];
    
    if (!expectedHeaders.every(h => header.includes(h))) {
      throw new Error(`CSV must include columns: ${expectedHeaders.join(', ')}`);
    }

    const trades = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== header.length) continue;

      const trade = {
        symbol: values[header.indexOf('symbol')].toUpperCase(),
        shares: parseFloat(values[header.indexOf('shares')]),
        price: parseFloat(values[header.indexOf('price')]),
        date: values[header.indexOf('date')]
      };

      if (isNaN(trade.shares) || isNaN(trade.price)) {
        throw new Error(`Invalid values data in row ${i + 1}`);
      }

      trades.push(trade);
    }

    return trades;
  };

  // Calculate holdings from trades
  const calculateHoldings = (trades) => {
    const holdingsMap = new Map();

    trades.forEach(trade => {
      const existing = holdingsMap.get(trade.symbol) || { shares: 0, totalCost: 0, trades: [] };
      existing.shares += trade.shares;
      existing.totalCost += trade.shares * trade.price;
      existing.trades.push(trade);
      holdingsMap.set(trade.symbol, existing);
    });

    return Array.from(holdingsMap.entries())
      .filter(([_, data]) => data.shares > 0)
      .map(([symbol, data]) => {
        const avgCostBasis = data.totalCost / data.shares;
        const currentPrice = getMostRecentPrice(symbol, trades);
        const currentValue = data.shares * currentPrice;
        const unrealizedGainLoss = currentValue - (data.shares * avgCostBasis);

        return {
          symbol,
          shares: data.shares,
          avgCostBasis,
          currentPrice,
          sector: 'All',
          unrealizedGainLoss,
          currentValue
        };
      });
  };

  // Calculate portfolio metrics
  const calculateMetrics = (holdings) => {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
    
    let topPerformer = { symbol: '', gain: -Infinity };
    let worstPerformer = { symbol: '', loss: Infinity };

    holdings.forEach(holding => {
      const gainPercent = (holding.unrealizedGainLoss / (holding.shares * holding.avgCostBasis)) * 100;
      if (gainPercent > topPerformer.gain) {
        topPerformer = { symbol: holding.symbol, gain: gainPercent };
      }
      if (gainPercent < worstPerformer.loss) {
        worstPerformer = { symbol: holding.symbol, loss: gainPercent };
      }
    });

    return {
      totalValue,
      topPerformer,
      worstPerformer: { symbol: worstPerformer.symbol, loss: worstPerformer.loss },
      uniqueSymbols: holdings.length
    };
  };

  // Calculate portfolio timeline
  const calculateTimeline = (trades) => {
    const dateMap = new Map();
    const runningHoldings = new Map();

    trades
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(trade => {
        const existing = runningHoldings.get(trade.symbol) || { shares: 0, avgCost: 0 };
        const newShares = existing.shares + trade.shares;
        const newAvgCost = newShares > 0 ? 
          ((existing.shares * existing.avgCost) + (trade.shares * trade.price)) / newShares : 0;
        
        if (newShares > 0) {
          runningHoldings.set(trade.symbol, { shares: newShares, avgCost: newAvgCost });
        } else {
          runningHoldings.delete(trade.symbol);
        }

        let totalValue = 0;
        runningHoldings.forEach((holding, symbol) => {
          const currentPrice = getMostRecentPrice(symbol, trades);
          totalValue += holding.shares * currentPrice;
        });

        dateMap.set(trade.date, totalValue);
      });

    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const parsedTrades = parseCSV(text);
      
      let filteredTrades = parsedTrades;
      if (dateRange.start && dateRange.end) {
        filteredTrades = parsedTrades.filter(trade => 
          trade.date >= dateRange.start && trade.date <= dateRange.end
        );
      }

      setTrades(filteredTrades);
      const calculatedHoldings = calculateHoldings(filteredTrades);
      setHoldings(calculatedHoldings);
      setPortfolioMetrics(calculateMetrics(calculatedHoldings));
      setTimelineData(calculateTimeline(filteredTrades));
      
    //  console.log('Data processed ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error parsing CSV');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort holdings
  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = holdings.filter(holding => {
      const matchesSearch = holding.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = sectorFilter === 'all' || holding.sector === sectorFilter;
      return matchesSearch && matchesSector;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortConfig.direction === 'asc' 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [holdings, searchTerm, sectorFilter, sortConfig]);

  // Pagination
  const paginatedHoldings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedHoldings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedHoldings, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedHoldings.length / itemsPerPage);

  // Sorting handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get unique sectors for filter
  const uniqueSectors = [...new Set(holdings.map(h => h.sector))];

  // Prepare pie chart data
  const pieChartData = holdings.map((holding, index) => ({
    name: holding.symbol,
    value: holding.currentValue,
    fill: COLORS[index % COLORS.length]
  }));

  return (
  
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">


        {/* File Upload Card */}
    <div className="rounded-lg border-[#d1d5dc] border shadow-sm bg-gradient-to-r from-[#1d4ed8] to-[#007fff]">
          <div className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="border-2 border-dashed border-[#d1d5dc] rounded-lg p-8 w-full max-w-md text-center transition-colors">
                <Upload className="mx-auto mb-4 h-12 w-12 hover:text-gray-400 text-white" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-white hover:font-bold font-medium">Choose CSV file</span>
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden"/>
                </label>
                <p className="text-white mt-1 text-sm">
              Upload your trade data CSV file 
            </p>
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 text-red-700 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              
              {isLoading && (
                <div className="text-blue-600">Processing CSV...</div>
              )}
            </div>
          </div>
        </div>

        {portfolioMetrics && (
          <>
              <h1 className='text-2xl font-bold'>Portfolio Summary</h1>

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#3b82f6]">Total Portfolio Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                       ₹{portfolioMetrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className='bg-[#dbeafe] p-3 rounded'>
                  <PieChart className="h-5 w-5 text-[#2563eb]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#3b82f6]">Top Performer</p>
                    <p className="text-2xl font-bold ">{portfolioMetrics.topPerformer.symbol}</p>
                    <p className="text-sm text-green-600">+{portfolioMetrics.topPerformer.gain.toFixed(2)}%</p>
                  </div>
                  
                    <div className='bg-[#dbeafe] p-3 rounded'>
                    <TrendingUp className="h-5 w-5 text-[#2563eb]" />
                  </div>
                
                </div>
              </div>

              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#3b82f6]">Worst Performer</p>
                    <p className="text-2xl font-bold ">{portfolioMetrics.worstPerformer.symbol}</p>
                    <p className="text-sm text-red-600">{portfolioMetrics.worstPerformer.loss.toFixed(2)}%</p>
                  </div>
                  <div className='bg-[#dbeafe] p-3 rounded'>
                      <TrendingDown className="h-5 w-5 text-[#2563eb]" />
                  </div>
                
                </div>
              </div>

              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#3b82f6]">Unique Symbols</p>
                    <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.uniqueSymbols}</p>
                  </div>
                  <div className='bg-[#dbeafe] p-3 rounded'>
                      <BarChart3 className="h-5 w-5 text-[#2563eb]" />
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 border-b border-[#d1d5dc]">
                  <h3 className="text-lg font-semibold">Portfolio Allocation</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="value"
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Value']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
                <div className="p-6 border-b border-[#d1d5dc]">
                  <h3 className="text-lg font-semibold">Portfolio Value Over Time</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Portfolio Value']} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
              <h1 className='text-2xl font-bold'>Holdings Table</h1>

            {/* Holdings Table */}
            <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
              <div className="p-6 border-b border-[#d1d5dc]">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Total Holdings
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {filteredAndSortedHoldings.length}
                  </span>
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search symbols..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-[#d1d5dc] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {/* <select
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value)}
                      className="px-3 py-2 border border-[#d1d5dc] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Sectors</option>
                      {uniqueSectors.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select> */}
                    
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="px-3 py-2 border border-[#d1d5dc] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="px-3 py-2 border border-[#d1d5dc] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-[#d1d5dc]"></div>
                
                {/* Table */}
                <div className="rounded-md border border-[#d1d5dc] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          { key: 'symbol', label: 'Symbol' },
                          { key: 'shares', label: 'Shares' },
                          { key: 'avgCostBasis', label: 'Avg Cost' },
                          { key: 'currentPrice', label: 'Current Price' },
                          { key: 'currentValue', label: 'Current Value' },
                          { key: 'unrealizedGainLoss', label: 'Unrealized Gain/Loss' }
                        ].map(column => (
                          <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => handleSort(column.key)}
                              className="flex items-center gap-1 hover:text-gray-700 font-medium"
                            >
                              {column.label}
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#d1d5dc]">
                      {paginatedHoldings.map((holding) => (
                        <tr key={holding.symbol} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{holding.symbol}</span>
                              {/* <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-[#d1d5dc]">
                                {holding.sector}
                              </span> */}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{holding.shares.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">₹{holding.avgCostBasis.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">₹{holding.currentPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">₹{holding.currentValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ₹{holding.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.unrealizedGainLoss >= 0 ? '+' : ''} ₹{holding.unrealizedGainLoss.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-[#d1d5dc] rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          page === currentPage 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm border border-[#d1d5dc] rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!portfolioMetrics && !isLoading && (
          <div className="bg-white rounded-lg border-[#d1d5dc] border shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <h3 className="text-xl font-semibold mb-2">Upload a CSV file Format Only</h3>
              <p className="text-gray-600 text-center">Sample CSV format<br />
                symbol,shares,price,date<br />
                AAPL,10,172.35,2024-06-12<br />
                TSLA,5,225.40,2024-06-13<br />
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPortfolioTracker;