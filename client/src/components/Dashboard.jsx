import { useState } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Settings, History } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({ total: 120, pass: 115, fail: 5 });
  const [threshold, setThreshold] = useState(0.85);
  const [status, setStatus] = useState('IDLE'); // PASS, FAIL, IDLE
  const [history, setHistory] = useState([
    { id: 1, time: '10:00:01', status: 'PASS', confidence: 0.98 },
    { id: 2, time: '10:00:05', status: 'PASS', confidence: 0.95 },
    { id: 3, time: '10:00:12', status: 'FAIL', confidence: 0.45 },
    { id: 4, time: '10:00:15', status: 'PASS', confidence: 0.99 },
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-wider">QC HACKATHON SYSTEM</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Online
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Video Feed & Live Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Feed Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg relative group">
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-white z-10">
              LIVE FEED
            </div>
            <div className="aspect-video bg-black flex items-center justify-center text-slate-600">
              {/* Placeholder for MJPEG Stream */}
              <div className="text-center">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Waiting for Camera Stream...</p>
              </div>
            </div>
            
            {/* Live Status Overlay (Simulated) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Current Detection</p>
                  <p className="text-xl font-bold text-white">Product #12345</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${
                  status === 'PASS' ? 'bg-green-500/20 text-green-400' : 
                  status === 'FAIL' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {status === 'PASS' && <CheckCircle className="w-5 h-5" />}
                  {status === 'FAIL' && <XCircle className="w-5 h-5" />}
                  {status === 'IDLE' ? 'READY' : status}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Controls */}
        <div className="space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Scanned</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-blue-400">
                {stats.total > 0 ? ((stats.pass / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Passed</p>
              <p className="text-3xl font-bold text-green-400">{stats.pass}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-400">{stats.fail}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Configuration</h2>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Confidence Threshold</span>
                <span className="text-blue-400 font-mono">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button 
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              onClick={() => setStats({ total: 0, pass: 0, fail: 0 })}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Counters
            </button>
          </div>
        </div>

        {/* Bottom Row: History Log */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold">Recent Inspections</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-slate-400">#{item.id}</td>
                      <td className="px-6 py-3">{item.time}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'PASS' 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {item.status === 'PASS' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono">
                        {(item.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
