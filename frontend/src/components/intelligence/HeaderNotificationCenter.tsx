import React, { useRef, useEffect } from 'react';
import { Bell, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, postNotificationRead } from '../../services/intelligence';
import { useUIStore } from '../../stores/uiStore';

export const HeaderNotificationCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const popoverRef = useRef<HTMLDivElement>(null);

  const isNotificationCenterOpen = useUIStore((state) => state.isNotificationCenterOpen);
  const setNotificationCenterOpen = useUIStore((state) => state.setNotificationCenterOpen);
  const setSelectedNode = useUIStore((state) => state.setSelectedNode);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 15000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => postNotificationRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleReadMutation = useMutation({
    mutationFn: (id: number) => postNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNotificationCenterOpen(false);
      }
    };
    if (isNotificationCenterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationCenterOpen, setNotificationCenterOpen]);

  const unreadCount = data?.unread_count || 0;
  const notifications = data?.notifications || [];

  const handleSelectEntity = (notif: any) => {
    if (notif.id && !notif.is_read) {
      markSingleReadMutation.mutate(notif.id);
    }
    if (notif.entity_type && notif.entity_id) {
      const typeKey = notif.entity_type === 'person' ? 'person' : notif.entity_type === 'company' ? 'company' : 'application';
      setSelectedNode(`${typeKey}-${notif.entity_id}`, typeKey, notif.entity_id);
      setNotificationCenterOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setNotificationCenterOpen(!isNotificationCenterOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-2xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isNotificationCenterOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="font-extrabold text-xs tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-md font-bold text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleSelectEntity(notif)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.is_read ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium mt-1 block">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
