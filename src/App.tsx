/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Upload, 
  FileText, 
  Layout, 
  GitBranch, 
  Presentation, 
  Link as LinkIcon,
  Loader2,
  ArrowRight,
  Sparkles,
  Cpu,
  Download,
  Printer,
  Lightbulb,
  MessageSquare,
  Folder
} from 'lucide-react';
import Markdown from 'react-markdown';
import { analyzeResearch, ResearchResult } from './services/gemini';
import { Flowchart } from './components/Flowchart';
import { SlideDeck } from './components/SlideDeck';
import { handleFirestoreError, OperationType } from './lib/firestoreErrors';
import { cn } from './lib/utils';
import { exportToMarkdown, downloadPDF } from './lib/exportUtils';
import { FeedbackModal } from './components/FeedbackModal';
import { LibraryModal } from './components/LibraryModal';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  serverTimestamp,
  User
} from './firebase';
import { LogIn, LogOut, User as UserIcon, Library as LibraryIcon, Bookmark } from 'lucide-react';

type Tab = 'overview' | 'flowchart' | 'slides' | 'citations' | 'research' | 'projects';

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore the error
        return;
      }
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const saveToLibrary = async (researchResult: ResearchResult, researchQuery: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'research_sessions'), {
        uid: user.uid,
        query: researchQuery,
        result: researchResult,
        createdAt: serverTimestamp()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'research_sessions');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await analyzeResearch(query);
      setResult(data);
      setActiveTab('overview');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeResearch({
          data: base64,
          mimeType: file.type
        });
        setResult(data);
        setActiveTab('overview');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab('overview')}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Explore And Notion</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
            <button 
              onClick={() => {
                if (!user) handleSignIn();
                else setActiveTab('projects');
              }}
              className={cn(
                "hover:text-orange-500 transition-colors flex items-center gap-2",
                activeTab === 'projects' ? "text-orange-500" : ""
              )}
              title="View your research projects"
            >
              <Folder size={18} />
              <span>Projects</span>
            </button>

            <button 
              onClick={() => setIsLibraryOpen(true)}
              className="hover:text-orange-500 transition-colors flex items-center gap-2"
              title="Open your saved research library"
            >
              <LibraryIcon size={18} />
              <span>Library</span>
            </button>

            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2"
              title="Send us your feedback"
            >
              <MessageSquare size={16} className="text-orange-500" />
              <span>Feedback</span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-zinc-900 leading-tight">{user.displayName}</span>
                  <button 
                    onClick={handleSignOut} 
                    className="text-[10px] text-zinc-400 hover:text-orange-500 uppercase tracking-wider font-bold"
                    title="Sign out of your account"
                  >
                    Sign Out
                  </button>
                </div>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || ''} 
                    className="w-8 h-8 rounded-full border border-zinc-200" 
                    referrerPolicy="no-referrer" 
                    title={user.displayName || 'User profile'}
                  />
                ) : (
                  <div 
                    className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400"
                    title={user.displayName || 'User profile'}
                  >
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {activeTab === 'projects' && user ? (
          <ProjectWorkspace user={user} onHome={() => setActiveTab('overview')} />
        ) : (
          <>
            {/* Hero / Search Section */}
            <section className="mb-16">
          <div className="max-w-3xl">
            <h1 className="font-display text-6xl md:text-7xl font-bold leading-[0.9] mb-6 tracking-tighter">
              Research, <br />
              <span className="text-orange-500 italic">Simplified.</span>
            </h1>
            <p className="text-xl text-zinc-500 mb-10 max-w-xl">
              Upload a PDF or enter a topic to generate flowcharts, slides, and simplified insights from central research databases.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Enter a research topic (e.g., CRISPR gene editing)..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  title="Search for research"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                </button>
              </form>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-colors font-medium shadow-sm disabled:opacity-50"
                title="Upload a PDF research paper"
              >
                <Upload size={20} />
                <span>Upload PDF</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Tabs and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
                  {[
                    { id: 'overview', label: 'Overview', icon: Layout },
                    { id: 'flowchart', label: 'Flowchart', icon: GitBranch },
                    { id: 'slides', label: 'Slides', icon: Presentation },
                    { id: 'citations', label: 'Citations', icon: LinkIcon },
                    { id: 'research', label: 'Further Research', icon: Lightbulb },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === tab.id 
                          ? "bg-white text-zinc-900 shadow-sm" 
                          : "text-zinc-500 hover:text-zinc-900"
                      )}
                      title={`View ${tab.label}`}
                    >
                      <tab.icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.id === 'citations' && result && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors",
                          activeTab === 'citations' 
                            ? "bg-orange-100 text-orange-600" 
                            : "bg-zinc-200 text-zinc-600"
                        )}>
                          {result.citations.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                  <div className="flex items-center gap-2">
                    {user && result && (
                      <button
                        onClick={() => saveToLibrary(result, query)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50"
                        title="Save this analysis to your library"
                      >
                        <Bookmark size={16} />
                        <span>Save to Library</span>
                      </button>
                    )}
                    <button
                      onClick={() => exportToMarkdown(result)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
                      title="Export analysis as Markdown"
                    >
                      <Download size={16} />
                      <span>Export MD</span>
                    </button>
                    <button
                      onClick={() => downloadPDF(result)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                      title="Download analysis as PDF"
                    >
                      <Download size={16} />
                      <span>Download PDF</span>
                    </button>
                  </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-display text-2xl font-bold">Summary</h2>
                          <div className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                            <LinkIcon size={14} />
                            <span>{result.citations.length} Citations</span>
                          </div>
                        </div>
                        <div className="prose prose-zinc max-w-none">
                          <Markdown>{result.overview}</Markdown>
                        </div>
                      </div>
                      
                      <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 text-white">
                        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                          <Search size={24} className="text-orange-500" />
                          Research Gap
                        </h2>
                        <p className="text-zinc-300 leading-relaxed">
                          {result.researchGap}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100">
                        <h2 className="font-display text-2xl font-bold text-orange-900 mb-4">Simplified Concept</h2>
                        <p className="text-orange-800 leading-relaxed text-lg">
                          {result.simplifiedConcept}
                        </p>
                      </div>

                      <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                          <Sparkles size={24} className="text-orange-500" />
                          Current Study
                        </h2>
                        <p className="text-zinc-600 leading-relaxed">
                          {result.currentStudy}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'flowchart' && (
                  <div className="space-y-6">
                    <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                      <h2 className="font-display text-2xl font-bold mb-6">Process Flowchart</h2>
                      <Flowchart chart={result.flowchart} />
                    </div>
                  </div>
                )}

                {activeTab === 'slides' && (
                  <div className="space-y-6">
                    <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                      <h2 className="font-display text-2xl font-bold mb-6">Study Slides</h2>
                      <SlideDeck slides={result.slides} />
                    </div>
                  </div>
                )}

                {activeTab === 'citations' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-display text-2xl font-bold">Scientific Citations</h2>
                      <div className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold border border-orange-200">
                        {result.citations.length} Sources Found
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {result.citations.map((citation, i) => (
                      <a
                        key={i}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-6 bg-white rounded-3xl border border-zinc-200 hover:border-orange-500 transition-all group flex flex-col h-full"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-zinc-100 rounded-xl text-zinc-500 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                            <FileText size={20} />
                          </div>
                          <ArrowRight size={16} className="text-zinc-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-zinc-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {citation.title}
                          </h3>
                          
                          <div className="space-y-2 mt-4">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                              <span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 border border-zinc-200">
                                {citation.journal}
                              </span>
                              <span className="text-zinc-400">•</span>
                              <span>{citation.date}</span>
                            </div>
                            
                            <p className="text-sm text-zinc-500 line-clamp-2 italic">
                              {citation.authors.join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-mono truncate max-w-[150px]">
                            {new URL(citation.url).hostname}
                          </span>
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            View Article
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
                )}

                {activeTab === 'research' && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <h2 className="font-display text-2xl font-bold mb-4">Further Research Ideas</h2>
                        <div className="prose prose-zinc max-w-none">
                          <Markdown>{result.furtherResearch.ideas}</Markdown>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 text-white">
                        <h2 className="font-display text-2xl font-bold mb-6">Research Workflow</h2>
                        <Flowchart chart={result.furtherResearch.workflow} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mb-6">
                <Search size={40} />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Ready to analyze</h2>
              <p className="text-zinc-500 max-w-sm">
                Enter a topic or upload a research paper to get started with your AI research assistant.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-display font-bold">Explore And Notion</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-900">Privacy</a>
            <a href="#" className="hover:text-zinc-900">Terms</a>
            <a href="#" className="hover:text-zinc-900">API</a>
            <a href="#" className="hover:text-zinc-900">Support</a>
          </div>
          <p className="text-sm text-zinc-400 font-mono">© 2026 Explore And Notion. Built for Researchers.</p>
        </div>
      </footer>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={(res) => {
          setResult(res);
          setActiveTab('overview');
        }}
      />

      <AnimatePresence>
        {saving && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-zinc-900 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl z-[100]"
          >
            <Loader2 className="animate-spin" size={16} />
            <span className="text-xs font-bold">Saving to Library...</span>
          </motion.div>
        )}
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl z-[100]"
          >
            <Sparkles size={16} />
            <span className="text-xs font-bold">Saved to Library!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
