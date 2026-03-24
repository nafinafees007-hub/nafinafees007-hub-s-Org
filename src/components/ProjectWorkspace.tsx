import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Folder, 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  Trash2, 
  Play, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  X,
  Search,
  Sparkles,
  Layout,
  GitBranch,
  Presentation,
  Lightbulb,
  Download,
  ArrowUpDown
} from 'lucide-react';
import { 
  db, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  User
} from '../firebase';
import { analyzeProject, ResearchResult } from '../services/gemini';
import { Flowchart } from './Flowchart';
import { SlideDeck } from './SlideDeck';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { exportToMarkdown, downloadPDF } from '../lib/exportUtils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface ProjectFile {
  name: string;
  mimeType: string;
  data: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  links: string[];
  analysis?: ResearchResult;
  createdAt: any;
}

interface ProjectWorkspaceProps {
  user: User;
  onHome: () => void;
}

export function ProjectWorkspace({ user, onHome }: ProjectWorkspaceProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'flowchart' | 'slides' | 'citations' | 'research'>('overview');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'projects'),
      where('uid', '==', user.uid),
      orderBy(sortBy === 'date' ? 'createdAt' : 'name', sortBy === 'date' ? 'desc' : 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      
      if (selectedProject) {
        const updated = projectsData.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'projects');
    });

    return () => unsubscribe();
  }, [user.uid, selectedProject?.id, sortBy]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await addDoc(collection(db, 'projects'), {
        uid: user.uid,
        name: newName,
        description: newDescription,
        files: [],
        links: [],
        createdAt: serverTimestamp()
      });
      setNewName('');
      setNewDescription('');
      setIsCreating(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    // Firestore document limit is 1MB. Base64 increases size by ~33%.
    // We limit to 700KB to be safe.
    if (file.size > 700 * 1024) {
      alert("File is too large. Please upload files smaller than 700KB due to database limitations.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const newFile: ProjectFile = {
        name: file.name,
        mimeType: file.type,
        data: base64
      };

      try {
        await updateDoc(doc(db, 'projects', selectedProject.id), {
          files: [...(selectedProject.files || []), newFile]
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim() || !selectedProject) return;

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        links: [...(selectedProject.links || []), newLink]
      });
      setNewLink('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleRemoveFile = async (index: number) => {
    if (!selectedProject) return;
    const updatedFiles = [...selectedProject.files];
    updatedFiles.splice(index, 1);
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        files: updatedFiles
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleRemoveLink = async (index: number) => {
    if (!selectedProject) return;
    const updatedLinks = [...selectedProject.links];
    updatedLinks.splice(index, 1);
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        links: updatedLinks
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedProject) return;
    setAnalyzing(true);
    try {
      const result = await analyzeProject(
        selectedProject.name,
        selectedProject.description,
        selectedProject.files,
        selectedProject.links
      );
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        analysis: result
      });
      setActiveTab('overview');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (selectedProject) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
            title="Return to projects list"
          >
            <ArrowLeft size={20} />
            <span>Back to Projects</span>
          </button>

          <button 
            onClick={onHome}
            className="p-2 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 rounded-full transition-all shadow-sm"
            title="Exit to Home"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Project Sidebar */}
          <div className="lg:w-80 space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm space-y-4">
              <h2 className="font-display text-2xl font-bold">{selectedProject.name}</h2>
              <p className="text-sm text-zinc-500">{selectedProject.description}</p>
              
              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Files ({selectedProject.files?.length || 0})</span>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Upload a PDF file to this project"
                  >
                    <Plus size={18} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={handleFileUpload}
                  />
                </div>
                <div className="space-y-2">
                  {selectedProject.files?.map((file, i) => (
                    <div key={i} className="flex items-center justify-between group p-2 hover:bg-zinc-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-zinc-400 shrink-0" />
                        <span className="text-xs text-zinc-600 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveFile(i)}
                        className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove this file from project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Links ({selectedProject.links?.length || 0})</span>
                  </div>
                  <form onSubmit={handleAddLink} className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="Add link..."
                      className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-orange-500"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                    />
                    <button type="submit" className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors" title="Add link to project">
                      <Plus size={14} />
                    </button>
                  </form>
                  <div className="space-y-2">
                    {selectedProject.links?.map((link, i) => (
                      <div key={i} className="flex items-center justify-between group p-2 hover:bg-zinc-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <LinkIcon size={14} className="text-zinc-400 shrink-0" />
                          <span className="text-xs text-zinc-600 truncate">{link}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveLink(i)}
                          className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove this link from project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleRunAnalysis}
                  disabled={analyzing || (!selectedProject.files?.length && !selectedProject.links?.length)}
                  className="w-full py-3 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none"
                  title="Run AI analysis on all project materials"
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="flex-1 min-w-0">
            {selectedProject.analysis ? (
              <div className="space-y-8">
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
                        onClick={() => setActiveTab(tab.id as any)}
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
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportToMarkdown(selectedProject.analysis!)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
                      title="Export analysis as Markdown"
                    >
                      <Download size={16} />
                      <span>Export MD</span>
                    </button>
                    <button
                      onClick={() => downloadPDF(selectedProject.analysis!)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                      title="Download analysis as PDF"
                    >
                      <Download size={16} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                <div className="min-h-[400px]">
                  {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                          <h2 className="font-display text-2xl font-bold mb-4">Project Synthesis</h2>
                          <div className="prose prose-zinc max-w-none">
                            <Markdown>{selectedProject.analysis.overview}</Markdown>
                          </div>
                        </div>
                        
                        <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 text-white">
                          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                            <Search size={24} className="text-orange-500" />
                            Aggregated Research Gap
                          </h2>
                          <p className="text-zinc-300 leading-relaxed">
                            {selectedProject.analysis.researchGap}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100">
                          <h2 className="font-display text-2xl font-bold text-orange-900 mb-4">Simplified Concept</h2>
                          <p className="text-orange-800 leading-relaxed text-lg">
                            {selectedProject.analysis.simplifiedConcept}
                          </p>
                        </div>

                        <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                            <Sparkles size={24} className="text-orange-500" />
                            Current Focus
                          </h2>
                          <p className="text-zinc-600 leading-relaxed">
                            {selectedProject.analysis.currentStudy}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'flowchart' && (
                    <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                      <h2 className="font-display text-2xl font-bold mb-6">Methodology Flowchart</h2>
                      <Flowchart chart={selectedProject.analysis.flowchart} />
                    </div>
                  )}

                  {activeTab === 'slides' && (
                    <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                      <h2 className="font-display text-2xl font-bold mb-6">Project Overview Slides</h2>
                      <SlideDeck slides={selectedProject.analysis.slides} />
                    </div>
                  )}

                  {activeTab === 'citations' && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedProject.analysis.citations.map((citation, i) => (
                        <a
                          key={i}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-6 bg-white rounded-3xl border border-zinc-200 hover:border-orange-500 transition-all group flex flex-col h-full"
                        >
                          <h3 className="font-bold text-zinc-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {citation.title}
                          </h3>
                          <div className="mt-auto pt-4 border-t border-zinc-100">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                              <span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-600">{citation.journal}</span>
                              <span>{citation.date}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {activeTab === 'research' && (
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <h2 className="font-display text-2xl font-bold mb-4">Future Directions</h2>
                        <div className="prose prose-zinc max-w-none">
                          <Markdown>{selectedProject.analysis.furtherResearch.ideas}</Markdown>
                        </div>
                      </div>
                      <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 text-white">
                        <h2 className="font-display text-2xl font-bold mb-6">Proposed Workflow</h2>
                        <Flowchart chart={selectedProject.analysis.furtherResearch.workflow} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-300 mb-4 shadow-sm">
                  <Play size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No analysis yet</h3>
                <p className="text-zinc-500 max-w-sm px-6">
                  Upload your research materials and click "Run Analysis" to generate insights across all project data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight">Research Projects</h2>
          <p className="text-zinc-500">Manage and analyze multiple research streams.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl mr-2">
            <button
              onClick={() => setSortBy('date')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                sortBy === 'date' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
              title="Sort by newest"
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                sortBy === 'name' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
              title="Sort alphabetically"
            >
              A-Z
            </button>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
            title="Create a new research project"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
          <button 
            onClick={onHome}
            className="p-3 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 rounded-2xl transition-all shadow-sm"
            title="Exit to Home"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateProject} className="p-8 bg-orange-50 rounded-[32px] border border-orange-100 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-orange-900 uppercase tracking-wider">Project Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Quantum Computing Trends"
                    className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-orange-900 uppercase tracking-wider">Description</label>
                  <input 
                    type="text" 
                    placeholder="Brief overview of the research goal..."
                    className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2 text-orange-900 font-bold hover:bg-orange-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            layoutId={project.id}
            onClick={() => setSelectedProject(project)}
            className="group p-8 bg-white rounded-[40px] border border-zinc-200 hover:border-orange-500 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-orange-500/5"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                <Folder size={24} />
              </div>
              <button 
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                title="Delete this project"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-zinc-900 mb-2 group-hover:text-orange-600 transition-colors">{project.name}</h3>
            <p className="text-sm text-zinc-500 line-clamp-2 mb-6">{project.description}</p>
            
            <div className="flex items-center gap-4 pt-6 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                <FileText size={14} />
                <span>{project.files?.length || 0} Files</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                <LinkIcon size={14} />
                <span>{project.links?.length || 0} Links</span>
              </div>
              <ChevronRight size={16} className="ml-auto text-zinc-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}

        {projects.length === 0 && !isCreating && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mb-6">
              <Folder size={40} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No projects yet</h3>
            <p className="text-zinc-500 max-w-sm">
              Create your first project to start organizing multiple research sources and running aggregated analyses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
