import React, { useState } from 'react';
import { X, ExternalLink, Mail, Phone, MapPin, Building, Trash2, Plus, MessageSquare, History as HistoryIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPersonDetails, deletePerson } from '../../services/people';
import { fetchRelationship, updateRelationshipStatus, addRelationshipNote } from '../../services/relationships';
import { StatusPipeline } from './StatusPipeline';
import { getStatusConfig } from '../../config/statuses';

interface PersonDetailsPanelProps {
  personId: number;
  onClose: () => void;
}

export const PersonDetailsPanel: React.FC<PersonDetailsPanelProps> = ({ personId, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'history'>('overview');
  const [newNote, setNewNote] = useState('');

  const { data: person, isLoading: isPersonLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => fetchPersonDetails(personId),
  });

  const relationshipId = person?.relationship_id;
  const { data: relationship } = useQuery({
    queryKey: ['relationship', relationshipId],
    queryFn: () => (relationshipId ? fetchRelationship(relationshipId) : null),
    enabled: !!relationshipId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ relId, status, note }: { relId: number; status: string; note?: string }) =>
      updateRelationshipStatus(relId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', relationshipId] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ relId, content }: { relId: number; content: string }) =>
      addRelationshipNote(relId, content),
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['relationship', relationshipId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      onClose();
    },
  });

  if (isPersonLoading || !person) {
    return (
      <div className="w-80 md:w-96 bg-white border-l border-slate-200 h-full p-6 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-2" />
        <span className="text-xs">Loading contact details...</span>
      </div>
    );
  }

  const currentStatus = relationship?.current_status || person.current_status || 'CONTACT_FOUND';

  const handleStatusChange = async (newStatus: string, note?: string) => {
    if (relationshipId) {
      await updateStatusMutation.mutateAsync({ relId: relationshipId, status: newStatus, note });
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !relationshipId) return;
    addNoteMutation.mutate({ relId: relationshipId, content: newNote.trim() });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${person.name}?`)) {
      deleteMutation.mutate(person.id);
    }
  };

  return (
    <div className="w-full md:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold text-base flex items-center justify-center shadow-md border-2 border-white">
            {person.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-tight">{person.name}</h3>
            <p className="text-xs text-slate-600 font-medium">{person.designation || 'Connection'}</p>
            {person.company_detail && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold mt-0.5">
                <Building className="w-3 h-3" />
                {person.company_detail.name}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-2">
        {person.linkedin_url ? (
          <a
            href={person.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>LinkedIn Profile</span>
          </a>
        ) : (
          <span className="flex-1 py-1.5 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No LinkedIn URL
          </span>
        )}

        <button
          onClick={handleDelete}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
          title="Delete Contact"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50/50 px-2 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Notes ({relationship?.notes?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          History ({relationship?.status_events?.length || 0})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{person.email || 'No email specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{person.phone || 'No phone specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{person.location || 'No location specified'}</span>
              </div>
            </div>

            <StatusPipeline
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              isUpdating={updateStatusMutation.isPending}
            />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a new note for this connection..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </form>

            <div className="space-y-2">
              {relationship?.notes && relationship.notes.length > 0 ? (
                relationship.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No notes logged yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Status Change Timeline
            </h4>

            {relationship?.status_events && relationship.status_events.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pl-4 py-1">
                {relationship.status_events.map((evt) => {
                  const toCfg = getStatusConfig(evt.to_status);
                  return (
                    <div key={evt.id} className="relative group">
                      <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${toCfg.bgClass} ${toCfg.textClass} ${toCfg.borderClass}`}>
                            {toCfg.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(evt.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {evt.note && <p className="text-slate-700 italic pt-1">{evt.note}</p>}
                        {evt.created_by_username && (
                          <span className="text-[10px] text-slate-400 block pt-0.5">
                            By: {evt.created_by_username}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No history events recorded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
