import { FileText, Download, CheckCircle2, List } from 'lucide-react';

export default function NotesViewer({ notes }) {
  if (!notes) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 p-6 bg-slate-50/50 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-primary-500" />
            {notes.title} Note Summary
          </h2>
          <p className="text-slate-500 text-sm mt-1">AI generated from meeting transcript</p>
        </div>
        <button className="flex items-center space-x-2 text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" /> Summary
          </h3>
          <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">{notes.summary}</p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3 flex items-center">
            <List className="w-4 h-4 mr-2" /> Key Points
          </h3>
          <ul className="space-y-3">
            {notes.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs flex items-center justify-center font-bold mr-3 shrink-0 mt-0.5">{index + 1}</span>
                <span className="text-slate-700">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Action Items
          </h3>
          <div className="space-y-3">
            {notes.actionItems.map((item, index) => (
              <div key={index} className="flex items-center bg-slate-50 border border-slate-100 p-3 rounded-lg">
                <input type="checkbox" className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 mr-3" />
                <span className="text-slate-800 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
