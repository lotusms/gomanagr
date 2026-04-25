import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { isMemberRole } from '@/config/rolePermissions';
import { getUserOrganization } from '@/services/organizationService';
import Avatar from '@/components/ui/Avatar';
import { MdAutoAwesome } from 'react-icons/md';
import { HiArrowsExpand, HiPaperAirplane, HiChevronDown, HiRefresh } from 'react-icons/hi';

const STORAGE_KEY = 'gomanagr_ai_agent_chat_v1';
const DEFAULT_GREETING = "Hi! I'm Hermes, your GoManagr AI assistant. Ask me about schedules, invoices, workflows, or business insights.";

function withTimestamp(message) {
  return {
    ...message,
    createdAt: message?.createdAt || new Date().toISOString(),
  };
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function readStoredMessages() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(withTimestamp) : [];
  } catch (_) {
    return [];
  }
}

function buildDefaultConversation() {
  return [
    {
      role: 'assistant',
      content: DEFAULT_GREETING,
      createdAt: new Date().toISOString(),
    },
  ];
}

export default function AIAgentChat({ compact = false, showExpand = false, onCollapse, className = '', resetSignal = 0 }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { account: userAccount, preview: previewAccount } = useUserAccount();
  const [organization, setOrganization] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const stored = readStoredMessages();
    if (stored.length) {
      setMessages(stored);
    } else {
      setMessages(buildDefaultConversation());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!resetSignal) return;
    const fresh = buildDefaultConversation();
    setMessages(fresh);
    setInput('');
    setError('');
    window.localStorage.removeItem(STORAGE_KEY);
  }, [resetSignal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch (_) {}
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    let active = true;
    async function loadOrganization() {
      if (!currentUser?.uid) {
        if (active) setOrganization(null);
        return;
      }
      try {
        const org = await getUserOrganization(currentUser.uid);
        if (active) setOrganization(org || null);
      } catch (err) {
        if (active) setOrganization(null);
      }
    }
    loadOrganization();
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const account = previewAccount ? { ...userAccount, ...previewAccount } : userAccount;
  const trimUrl = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    return s.length > 0 ? s : '';
  };

  const orgLogoUrl = trimUrl(organization?.logo_url);
  const personalPhotoUrl = trimUrl(account?.photoUrl || account?.pictureUrl || account?.companyLogo || currentUser?.photoURL);
  const companyLogoOnly = trimUrl(account?.companyLogo);
  const memberRole = organization?.membership?.role;
  const isTeamMember = isMemberRole(memberRole);

  const userAvatarUrl = isTeamMember ? (personalPhotoUrl || orgLogoUrl) : (orgLogoUrl || companyLogoOnly || personalPhotoUrl);
  const userDisplayName =
    (account?.firstName || account?.lastName)
      ? `${account?.firstName || ''} ${account?.lastName || ''}`.trim()
      : (currentUser?.displayName || currentUser?.email || 'You');

  const sendMessage = async (overrideText) => {
    const rawInput =
      typeof overrideText === 'string'
        ? overrideText
        : typeof input === 'string'
          ? input
          : '';
    const text = rawInput.trim();
    if (!text || loading) return;

    setError('');
    if (!overrideText) setInput('');
    const userMessage = { role: 'user', content: text, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          userId: currentUser?.uid || null,
          organizationId: organization?.id || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: payload.message, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      setError(err?.message || 'Unable to reach Hermes right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleReAsk = (content) => {
    if (!content || loading) return;
    sendMessage(content);
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
          <MdAutoAwesome className="text-primary-500" />
          <span>Hermes</span>
        </div>
        {showExpand && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/ai-agent')}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50"
              title="Open full chat"
            >
              <HiArrowsExpand />
              Expand
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Collapse chat"
              >
                <HiChevronDown />
              </button>
            )}
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className={`p-2.5 space-y-2.5 overflow-y-auto ${compact ? 'h-52' : 'h-[48vh] min-h-[336px]'}`}
      >
        {messages.map((message, idx) => (
          <div key={`${message.role}-${idx}`} className={`space-y-1 ${message.role === 'user' ? 'ml-auto' : ''}`}>
            <div className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                  <img src="/svg/Go_Logo_mini.svg" alt="GoManagr logo" className="w-5 h-5 object-contain" />
                </div>
              )}
              <div
                className={`max-w-[48%] rounded-2xl px-2.5 py-1.5 text-[13px] leading-5 whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <Avatar
                  size="sm"
                  src={userAvatarUrl}
                  name={userDisplayName}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              )}
            </div>
            <div className={`text-[10px] px-1 ${message.role === 'user' ? 'text-right pr-9 text-gray-500 dark:text-gray-400' : 'text-left pl-9 text-gray-500 dark:text-gray-400'}`}>
              {formatTimestamp(message.createdAt)}
            </div>
            {message.role === 'user' && (
              <div className="flex justify-end pr-9">
                <button
                  type="button"
                  onClick={() => handleReAsk(message.content)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-40"
                  title="Re-ask this question"
                >
                  <HiRefresh className="w-3 h-3" />
                  Re-ask
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
              <img src="/svg/Go_Logo_mini.svg" alt="GoManagr logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="max-w-[48%] rounded-2xl px-2.5 py-1.5 text-[13px] leading-5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      <div className="p-2.5 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hermes..."
            rows={1}
            className="flex-1 resize-none rounded-xl border-0 bg-transparent text-gray-900 dark:text-gray-100 px-1.5 py-1.5 text-[13px] leading-5 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 min-h-[32px] max-h-28"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!canSend}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
            title="Send"
          >
            <HiPaperAirplane className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
