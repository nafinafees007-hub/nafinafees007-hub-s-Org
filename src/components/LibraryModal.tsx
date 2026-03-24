import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Library, Search, Clock, Trash2, ArrowRight, Loader2, BookOpen, Link as LinkIcon } from 'lucide-react';
import { db, auth, query, collection, where, orderBy, onSnapshot, doc, Timestamp, deleteDoc } from '../firebase';
import { ResearchResult } from '../services/gemini';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { cn } from '../lib/utils';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: ResearchResult) => void;
}

interface SavedSession {
  id: string;
  query: string;
  result: ResearchResult;
  createdAt: Timestamp;
}

export function LibraryModal({ isOpen, onClose, onSelect }: LibraryModalProps) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const q = query(
      collection(db, 'research_sessions'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedSession[];
      setSessions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'research_sessions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'research_sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `research_sessions/${id}`);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 flex flex-col"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Library size={22} />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">Research Library</h2>
              <p className="text-xs text-zinc-500">Access your saved research sessions</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search your library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-100 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <Loader2 className="animate-spin" size={32} />
              <p>Loading your research...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 text-center px-8">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                <BookOpen size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">No sessions found</h3>
                <p className="text-sm">Start a new research session to see it here.</p>
              </div>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group p-4 bg-white border border-zinc-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                onClick={() => {
                  onSelect(session.result);
                  onClose();
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {session.query}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {session.createdAt.toDate().toLocaleDateString()} • {session.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <LinkIcon size={12} />
                    <span>{session.result.citations.length}</span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, session.id)}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete session"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ArrowRight className="text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
