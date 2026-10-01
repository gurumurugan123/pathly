import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  Palette,
  Bell,
  ShieldCheck,
  Database,
  Info,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileCode,
  Loader2,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { useAuthStore } from '../stores/authStore';
import { applyTheme } from '../utils/theme';
import {
  fetchUserSettings,
  updateUserSettings,
  updateUserProfile,
  changePassword,
  deleteAccount,
  exportUserData,
} from '../services/settings';
import { exportToCsv, exportToPdf } from '../utils/exportUtils';


type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'data' | 'about';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Settings Query
  const { data: userSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: fetchUserSettings,
  });

  // Settings State Toggles
  const [theme, setTheme] = useState('system');
  const [notifyRecs, setNotifyRecs] = useState(true);
  const [notifyFollowups, setNotifyFollowups] = useState(true);
  const [notifyApps, setNotifyApps] = useState(true);
  const [notifyInterviews, setNotifyInterviews] = useState(true);
  const [notifyGoals, setNotifyGoals] = useState(true);

  useEffect(() => {
    if (userSettings) {
      const savedTheme = localStorage.getItem('pathly_theme') || userSettings.theme || 'system';
      setTheme(savedTheme);
      applyTheme(savedTheme);
      setNotifyRecs(userSettings.notify_recommendations);
      setNotifyFollowups(userSettings.notify_followups);
      setNotifyApps(userSettings.notify_applications);
      setNotifyInterviews(userSettings.notify_interviews);
      setNotifyGoals(userSettings.notify_goals);
    }
  }, [userSettings]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  // Profile Mutation
  const profileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 3000);
    },
  });

  // Settings Mutation
  const settingsMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });

  // Change Password State & Mutation
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPwMsg({ text: 'Password changed successfully.', isError: false });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.current_password || err?.response?.data?.confirm_password || 'Failed to change password.';
      setPwMsg({ text: Array.isArray(msg) ? msg[0] : msg, isError: true });
    },
  });

  // Delete Account State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      logout();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to delete account.';
      setDeleteError(msg);
    },
  });

  // Export Data State & Handlers
  const [exportingType, setExportingType] = useState<'json' | 'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportJson = async () => {
    try {
      setExportingType('json');
      setExportError(null);
      const data = await exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pathly-export-${user?.username || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export JSON data', err);
      setExportError('Failed to generate JSON export.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingType('csv');
      setExportError(null);
      const data = await exportUserData();
      exportToCsv(data, `pathly-export-${user?.username || 'user'}.csv`);
    } catch (err: any) {
      console.error('Failed to export CSV data', err);
      setExportError('Failed to generate CSV export.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      setExportError(null);
      const data = await exportUserData();
      exportToPdf(data, `pathly-career-report-${user?.username || 'user'}.pdf`);
    } catch (err: any) {
      console.error('Failed to export PDF data', err);
      setExportError('Failed to generate PDF report.');
    } finally {
      setExportingType(null);
    }
  };


  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 shadow-xs">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your account preferences, notifications, security, and export controls.
          </p>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[560px]">
            {/* Left Tab Navigation */}
            <div className="w-full md:w-64 bg-slate-50/80 border-r border-slate-200/80 p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">
                Preferences
              </p>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Tab Content */}
            <div className="flex-1 p-8 space-y-6">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Profile Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Update your personal account information.</p>
                  </div>

                  {profileMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{profileMsg}</span>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      profileMutation.mutate({ first_name: firstName, last_name: lastName, username });
                    }}
                    className="space-y-4 text-xs font-semibold text-slate-700"
                  >
                    <div>
                      <label className="block mb-1">Username</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1">Email Address</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Email address cannot be changed directly for security.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={profileMutation.isPending}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{profileMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Appearance</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Customize the visual presentation of Pathly.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">Theme Preference</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'light', label: '☀️ Light', desc: 'Light mode' },
                        { key: 'dark', label: '🌙 Dark', desc: 'Dark mode' },
                        { key: 'system', label: '⚙️ System', desc: 'Match OS' },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => {
                            setTheme(t.key);
                            applyTheme(t.key);
                            localStorage.setItem('pathly_theme', t.key);
                            settingsMutation.mutate({ theme: t.key });
                          }}
                          className={`p-4 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                            theme === t.key
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-base mb-1">{t.label.split(' ')[0]}</div>
                          <div>{t.desc}</div>
                        </button>
                      ))}
                    </div>
                    {theme === 'dark' && (
                      <p className="text-xs text-indigo-600 font-semibold mt-1">✓ Dark mode is active</p>
                    )}
                    {theme === 'light' && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">✓ Light mode is active</p>
                    )}
                    {theme === 'system' && (
                      <p className="text-xs text-slate-500 font-semibold mt-1">Following your OS preference</p>
                    )}
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Notification Preferences</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Choose which intelligence notifications to receive.</p>
                  </div>

                  {isSettingsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading preferences...</div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        {
                          id: 'recs',
                          title: 'Career Recommendations',
                          desc: 'Receive proactive alerts for missing referrals and network gaps.',
                          val: notifyRecs,
                          setter: setNotifyRecs,
                          field: 'notify_recommendations',
                        },
                        {
                          id: 'followups',
                          title: 'Follow-up Reminders',
                          desc: 'Alerts when relationship follow-ups are due or overdue.',
                          val: notifyFollowups,
                          setter: setNotifyFollowups,
                          field: 'notify_followups',
                        },
                        {
                          id: 'apps',
                          title: 'Application Updates',
                          desc: 'Notifications when applications remain stale for 7+ days.',
                          val: notifyApps,
                          setter: setNotifyApps,
                          field: 'notify_applications',
                        },
                        {
                          id: 'interviews',
                          title: 'Interview Milestones',
                          desc: 'Preparation checklists and network contact reminders.',
                          val: notifyInterviews,
                          setter: setNotifyInterviews,
                          field: 'notify_interviews',
                        },
                        {
                          id: 'goals',
                          title: 'Career Goals',
                          desc: 'Progress updates on network coverage goals.',
                          val: notifyGoals,
                          setter: setNotifyGoals,
                          field: 'notify_goals',
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const newVal = !item.val;
                              item.setter(newVal);
                              settingsMutation.mutate({ [item.field]: newVal });
                            }}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              item.val ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Security & Authentication</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage your password and active sessions.</p>
                  </div>

                  {pwMsg && (
                    <div
                      className={`text-xs font-semibold rounded-xl p-3 border flex items-center gap-2 ${
                        pwMsg.isError
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {pwMsg.isError ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      <span>{pwMsg.text}</span>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      passwordMutation.mutate({ current_password: currentPw, new_password: newPw, confirm_password: confirmPw });
                    }}
                    className="space-y-3 text-xs font-semibold text-slate-700"
                  >
                    <div>
                      <label className="block mb-1">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordMutation.isPending}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {passwordMutation.isPending ? 'Updating...' : 'Change Password'}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">Session Controls</h3>
                    <button
                      type="button"
                      onClick={logout}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of Account</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DATA TAB */}
              {activeTab === 'data' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Data & Privacy Controls</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Export or permanently remove your Pathly career data.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Export Network Data</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Download your companies, network contacts, applications, and status history in your preferred format.
                      </p>
                    </div>

                    {exportError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{exportError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* PDF Export */}
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={exportingType !== null}
                        className="p-3.5 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl transition-all text-left flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                            {exportingType === 'pdf' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">PDF</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Career Report</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Styled executive summary with KPI badges and tables</p>
                        </div>
                      </button>

                      {/* CSV Export */}
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={exportingType !== null}
                        className="p-3.5 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-xl transition-all text-left flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                            {exportingType === 'csv' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">CSV</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Spreadsheet (.csv)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Excel and Google Sheets compatible dataset</p>
                        </div>
                      </button>

                      {/* JSON Export */}
                      <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={exportingType !== null}
                        className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md rounded-xl transition-all text-left flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                            {exportingType === 'json' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                            ) : (
                              <FileCode className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">JSON</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Raw Data (.json)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Full structured backup for developers</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-rose-900">Delete Account</h3>
                      <p className="text-[11px] text-rose-700/80 mt-0.5 leading-relaxed">
                        Permanently delete your Pathly account and all connected career graph data. This action cannot be undone.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(true);
                        setDeleteError(null);
                        setDeleteConfirmText('');
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Account...</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ABOUT TAB */}
              {activeTab === 'about' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">About Pathly</h2>
                    <p className="text-xs text-slate-500 mt-0.5">System information and architectural overview.</p>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Version</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">v4.2.0 (Phase 4 Intelligence)</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                      <span className="text-xs font-bold text-slate-300">Architecture</span>
                      <span className="text-xs font-mono text-slate-400">React Flow + DRF + Postgres</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                      <span className="text-xs font-bold text-slate-300">User Isolation</span>
                      <span className="text-xs font-mono text-emerald-400">Enforced & Verified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Delete Pathly Account?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This permanently removes your career network, applications, contacts, and relationship history.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Type <span className="font-mono font-extrabold text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono text-xs"
              />
            </div>

            {deleteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate('DELETE')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
