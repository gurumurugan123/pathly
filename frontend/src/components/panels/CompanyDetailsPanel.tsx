import React from 'react';
import { X, MapPin, Users, ExternalLink, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyDetails } from '../../services/companies';
import { fetchPeople, type PersonItem } from '../../services/people';
import { useUIStore } from '../../stores/uiStore';
import { getStatusConfig } from '../../config/statuses';

interface CompanyDetailsPanelProps {
  companyId: number;
  onClose: () => void;
}

export const CompanyDetailsPanel: React.FC<CompanyDetailsPanelProps> = ({ companyId, onClose }) => {
  const setSelectedNode = useUIStore((state) => state.setSelectedNode);

  const { data: company, isLoading: isCompLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompanyDetails(companyId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: () => fetchPeople(),
  });

  if (isCompLoading || !company) {
    return (
      <div className="w-80 md:w-96 bg-white border-l border-slate-200 h-full p-6 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-2" />
        <span className="text-xs">Loading company details...</span>
      </div>
    );
  }

  const companyPeople = people.filter((p: PersonItem) => p.company === companyId || p.company_detail?.id === companyId);

  return (
    <div className="w-full md:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shadow-md border border-slate-700">
            {company.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{company.name}</h3>
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>{company.website.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 bg-white space-y-2 text-xs">
        {company.industry && (
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-400">Industry:</span>
            <span className="font-bold text-slate-800">{company.industry}</span>
          </div>
        )}
        {company.location && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{company.location}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-slate-700 font-semibold pt-1">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>{companyPeople.length} Connections at {company.name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Connected Roster
        </h4>

        {companyPeople.length > 0 ? (
          <div className="space-y-2">
            {companyPeople.map((person: PersonItem) => {
              const statusCfg = getStatusConfig(person.current_status);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedNode(`person-${person.id}`, 'person', person.id)}
                  className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl transition-all shadow-xs flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                      {person.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                        {person.name}
                      </h5>
                      <p className="text-[10px] text-slate-500">{person.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}>
                      {statusCfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
            <p className="text-xs">No contacts connected to {company.name} yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
