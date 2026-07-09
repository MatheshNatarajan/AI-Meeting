import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, Clock, FileText, ChevronRight, Download, Loader2, Sparkles, MessageSquareText } from 'lucide-react';
import { api } from '../services/api';

export default function Notes() {
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const [data, meetings] = await Promise.all([
        api.getAllSummaries(),
        api.getMeetings()
      ]);
      const enrichedSummaries = (data || []).map(summary => {
        const matchingMeeting = meetings.find(m => m.id === summary.meetingId);
        return { ...summary, meetingDetails: matchingMeeting };
      });
      setSummaries(enrichedSummaries);
    } catch (err) {
      console.error('Error fetching summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSummaries = summaries.filter(s =>
    (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.meetingId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = () => {
    if (!selectedSummary) return;

    const content = `Meeting: ${selectedSummary.title || 'Untitled Meeting'}
Meeting ID: ${selectedSummary.meetingId}

Summary:
${selectedSummary.summary || 'No summary available.'}

Action Items:
${(selectedSummary.actionItems || []).map(item => '- ' + item).join('\n')}

${selectedSummary.fullTranscript ? `\nFull Transcript:\n${selectedSummary.fullTranscript}` : ''}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedSummary.title || 'meeting').replace(/\s+/g, '_')}_Notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Left sidebar: Meeting List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
            Meeting Notes
          </h2>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSummaries.length > 0 ? (
            filteredSummaries.map(note => (
              <button
                key={note.id}
                onClick={() => { setSelectedSummary(note); setShowTranscript(false); }}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between ${
                  selectedSummary?.id === note.id
                    ? 'bg-primary-50 border-primary-200 border'
                    : 'hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-800 line-clamp-1">{note.title || `Meeting ${note.meetingId}`}</h3>
                  <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                    <span className="flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {note.meetingId}
                    </span>
                    {note.actionItems && note.actionItems.length > 0 && (
                      <span className="bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                        {note.actionItems.length} actions
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${selectedSummary?.id === note.id ? 'text-primary-500' : 'text-slate-400'}`} />
              </button>
            ))
          ) : (
            <div className="text-center p-6 text-slate-500">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No meeting notes yet</p>
              <p className="text-xs mt-1">Notes will appear here after your meetings end</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Meeting Details */}
      <div className="flex-1 bg-white flex flex-col relative overflow-y-auto">
        {selectedSummary ? (
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 text-primary-600 mb-3 bg-primary-50 w-fit px-3 py-1 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI-Generated Summary</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-slate-900">{selectedSummary.title || 'Untitled Meeting'}</h1>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Notes
                </button>
              </div>

              {selectedSummary.meetingDetails && (
                 <div className="mb-6 border-b border-slate-100 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center text-slate-600">
                      <Calendar className="w-5 h-5 mr-3 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Date</p>
                        <p className="text-sm font-medium">{new Date(selectedSummary.meetingDetails.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Clock className="w-5 h-5 mr-3 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Time</p>
                        <p className="text-sm font-medium">{new Date(selectedSummary.meetingDetails.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({selectedSummary.meetingDetails.duration} min)</p>
                      </div>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Users className="w-5 h-5 mr-3 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Organizer</p>
                        <p className="text-sm font-medium truncate" title={selectedSummary.meetingDetails.organizer}>{selectedSummary.meetingDetails.organizer}</p>
                      </div>
                    </div>
                 </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary-500" />
                  <span className="font-medium">Meeting ID:</span>
                  <span className="ml-1">{selectedSummary.meetingId}</span>
                </div>

                {selectedSummary.actionItems && selectedSummary.actionItems.length > 0 && (
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-primary-500" />
                    <span className="font-medium">Action Items:</span>
                    <span className="ml-1">{selectedSummary.actionItems.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Summary */}
              <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  Overview
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedSummary.summary || 'No summary generated.'}</p>
              </section>



              {/* Action Items */}
              {selectedSummary.actionItems && selectedSummary.actionItems.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-emerald-500" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {selectedSummary.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3 flex-shrink-0"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Full Transcript Toggle */}
              {selectedSummary.fullTranscript && (
                <section>
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <MessageSquareText className="w-4 h-4 mr-2" />
                    {showTranscript ? 'Hide' : 'Show'} Full Transcript
                  </button>

                  {showTranscript && (
                    <div className="mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedSummary.fullTranscript}
                      </pre>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">Select a meeting</h3>
            <p className="text-sm">Choose a meeting from the list to view its AI-generated notes and summary</p>
          </div>
        )}
      </div>
    </div>
  );
}
