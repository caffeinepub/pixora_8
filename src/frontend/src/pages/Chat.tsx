import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  MessageCircle,
  PenSquare,
  Search,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppView } from "../App";
import type { Message, Profile, backendInterface } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface ChatProps {
  navigate: (view: AppView, profilePrincipal?: string) => void;
}

interface ConversationEntry {
  principal: Principal;
  profile: Profile | null;
  lastMessage?: string;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationList({
  conversations,
  loading,
  selectedPrincipal,
  onSelect,
  onNewMessage,
}: {
  conversations: ConversationEntry[];
  loading: boolean;
  selectedPrincipal: string | null;
  onSelect: (entry: ConversationEntry) => void;
  onNewMessage: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-bold text-foreground">Messages</h2>
        <Button
          size="icon"
          variant="ghost"
          data-ocid="chat.new_message.button"
          onClick={onNewMessage}
          className="w-8 h-8 rounded-lg"
          title="New message"
        >
          <PenSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div
            className="space-y-1 p-2"
            data-ocid="chat.conversations.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded bg-muted" />
                  <Skeleton className="h-2.5 w-36 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
            data-ocid="chat.conversations.empty_state"
          >
            <MessageCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={onNewMessage}
              className="text-primary mt-1"
            >
              Start one
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((entry, idx) => {
              const key = entry.principal.toString();
              const name = entry.profile?.username ?? `${key.slice(0, 8)}...`;
              const avatarSrc = entry.profile?.profilePicture
                ? entry.profile.profilePicture.getDirectURL()
                : undefined;
              return (
                <motion.button
                  type="button"
                  key={key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  data-ocid={`chat.conversation.item.${idx + 1}`}
                  onClick={() => onSelect(entry)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer",
                    selectedPrincipal === key
                      ? "bg-primary/15"
                      : "hover:bg-muted",
                  )}
                >
                  <Avatar className="w-10 h-10 shrink-0 pointer-events-none">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="avatar-fallback-gradient text-white text-sm font-semibold">
                      {name[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pointer-events-none">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {name}
                    </p>
                    {entry.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.lastMessage}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MessageThread({
  entry,
  messages,
  loading,
  myPrincipal,
  onSend,
  onBack,
}: {
  entry: ConversationEntry;
  messages: Message[];
  loading: boolean;
  myPrincipal: string;
  onSend: (text: string) => Promise<void>;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const name =
    entry.profile?.username ?? `${entry.principal.toString().slice(0, 8)}...`;
  const avatarSrc = entry.profile?.profilePicture
    ? entry.profile.profilePicture.getDirectURL()
    : undefined;

  // Auto-focus the input whenever this thread mounts or the conversation changes
  // This triggers the mobile keyboard to open immediately
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus on entry change is intentional
  useEffect(() => {
    // Small delay to ensure the element is visible and rendered before focusing
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [entry.principal]);

  // Scroll to bottom whenever messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText("");
      // Re-focus input after sending so user can type next message immediately
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          type="button"
          data-ocid="chat.thread.back.button"
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
            {name[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold text-foreground">{name}</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {loading ? (
          <div className="space-y-3 py-4" data-ocid="chat.thread.loading_state">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-end" : "justify-start",
                )}
              >
                <Skeleton
                  className={cn(
                    "h-9 rounded-2xl bg-muted",
                    i % 2 === 0 ? "w-32" : "w-44",
                  )}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="chat.thread.empty_state"
          >
            <MessageCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              Say hello to {name}!
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((msg, idx) => {
              const isMine = msg.sender.toString() === myPrincipal;
              return (
                <motion.div
                  key={msg.id.toString()}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  className={cn(
                    "flex",
                    isMine ? "justify-end" : "justify-start",
                  )}
                  data-ocid={`chat.message.item.${idx + 1}`}
                >
                  <div
                    className={cn(
                      "max-w-[72%] px-4 py-2 rounded-2xl text-sm leading-snug",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground border border-border rounded-bl-sm",
                    )}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-0.5",
                        isMine
                          ? "text-primary-foreground/70 text-right"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        <Input
          ref={inputRef}
          data-ocid="chat.message.input"
          placeholder={`Message ${name}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1 bg-muted border-border rounded-xl text-sm"
          disabled={sending}
        />
        <Button
          size="icon"
          data-ocid="chat.message.submit_button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function NewMessageDialog({
  open,
  onClose,
  onStartChat,
}: {
  open: boolean;
  onClose: () => void;
  onStartChat: (principal: Principal, profile: Profile | null) => void;
}) {
  const { actor } = useActor();
  const [allProfiles, setAllProfiles] = useState<[Principal, Profile][]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !actor) return;
    setSearch("");
    const load = async () => {
      setLoading(true);
      try {
        // Use searchUsers with empty string to get all users
        const results = await actor.searchUsers("");
        setAllProfiles(results as [Principal, Profile][]);
      } catch {
        toast.error("Could not load users.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, actor]);

  // Client-side filter so we don't depend on cmdk's filter behaviour
  const filtered = search.trim()
    ? allProfiles.filter(([, profile]) =>
        profile?.username?.toLowerCase().includes(search.toLowerCase()),
      )
    : allProfiles;

  const handleSelect = (p: Principal, profile: Profile | null) => {
    onStartChat(p, profile);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border rounded-2xl max-w-sm p-0 overflow-hidden"
        data-ocid="chat.new_message.dialog"
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-foreground text-base">
            New Message
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 pb-2 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-ocid="chat.search.input"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-border rounded-xl text-sm"
            autoFocus
          />
        </div>

        {/* User list */}
        <ScrollArea className="max-h-64 pb-2">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No users found.
            </p>
          ) : (
            <div className="px-2">
              {filtered.map(([p, profile], idx) => {
                const name =
                  profile?.username ?? `${p.toString().slice(0, 8)}...`;
                const avatarSrc = profile?.profilePicture
                  ? profile.profilePicture.getDirectURL()
                  : undefined;
                return (
                  <button
                    type="button"
                    key={p.toString()}
                    data-ocid={`chat.user_search.item.${idx + 1}`}
                    onMouseDown={(e) => {
                      // Use onMouseDown so it fires before dialog focus trapping
                      e.preventDefault();
                      handleSelect(p, profile);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Avatar className="w-8 h-8 shrink-0 pointer-events-none">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="avatar-fallback-gradient text-white text-xs font-semibold">
                        {name[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium pointer-events-none">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function Chat({ navigate: _navigate }: ChatProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);

  const [selectedEntry, setSelectedEntry] = useState<ConversationEntry | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [showThread, setShowThread] = useState(false); // mobile only
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    if (!actor) return;
    const load = async () => {
      setConvsLoading(true);
      try {
        const principals = await actor.getConversations();
        const entries = await Promise.all(
          principals.map(async (p) => {
            const profile = await actor.getUserProfile(p);
            return {
              principal: p,
              profile,
              lastMessage: undefined,
            } as ConversationEntry;
          }),
        );
        setConversations(entries);
      } catch {
        toast.error("Failed to load conversations.");
      } finally {
        setConvsLoading(false);
      }
    };
    load();
  }, [actor]);

  // Load messages for selected conversation + poll every 5s
  useEffect(() => {
    if (!actor || !selectedEntry) return;
    const load = async () => {
      setMessagesLoading(true);
      try {
        const msgs = await actor.getConversation(selectedEntry.principal);
        const sorted = [...msgs].sort((a, b) =>
          Number(a.timestamp - b.timestamp),
        );
        setMessages(sorted);
      } catch {
        toast.error("Failed to load messages.");
      } finally {
        setMessagesLoading(false);
      }
    };
    load();
    const interval = setInterval(async () => {
      if (!actor || !selectedEntry) return;
      try {
        const msgs = await actor.getConversation(selectedEntry.principal);
        const sorted = [...msgs].sort((a, b) =>
          Number(a.timestamp - b.timestamp),
        );
        setMessages(sorted);
      } catch {
        // Silently fail on poll errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, selectedEntry]);

  const handleSelectConversation = (entry: ConversationEntry) => {
    setSelectedEntry(entry);
    setMessages([]);
    setShowThread(true);
  };

  const handleSend = async (text: string) => {
    if (!actor || !selectedEntry || !identity) return;
    const myPrin = identity.getPrincipal();
    // Optimistic append
    const tempId = BigInt(Date.now());
    const optimistic: Message = {
      id: tempId,
      sender: myPrin,
      recipient: selectedEntry.principal,
      text,
      timestamp: BigInt(Date.now()) * 1_000_000n,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await actor.sendMessage(selectedEntry.principal, text);
      // Refresh for server canonical copy
      const msgs = await actor.getConversation(selectedEntry.principal);
      const sorted = [...msgs].sort((a, b) =>
        Number(a.timestamp - b.timestamp),
      );
      setMessages(sorted);
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.principal.toString() === selectedEntry.principal.toString()
            ? { ...c, lastMessage: text }
            : c,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send message.";
      toast.error(msg);
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleStartChat = (principal: Principal, profile: Profile | null) => {
    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.principal.toString() === principal.toString(),
    );
    if (existing) {
      handleSelectConversation(existing);
    } else {
      const newEntry: ConversationEntry = {
        principal,
        profile,
        lastMessage: undefined,
      };
      setConversations((prev) => [newEntry, ...prev]);
      handleSelectConversation(newEntry);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="pixora-card overflow-hidden flex"
        style={{ height: "calc(100vh - 180px)", minHeight: 480 }}
      >
        {/* Conversation list — always visible on desktop, hidden on mobile when thread open */}
        <div
          className={cn(
            "border-r border-border flex-shrink-0",
            "w-full lg:w-72",
            // Mobile: hide when thread is open
            showThread && selectedEntry
              ? "hidden lg:flex lg:flex-col"
              : "flex flex-col",
          )}
        >
          <ConversationList
            conversations={conversations}
            loading={convsLoading}
            selectedPrincipal={selectedEntry?.principal.toString() ?? null}
            onSelect={handleSelectConversation}
            onNewMessage={() => setNewMsgOpen(true)}
          />
        </div>

        {/* Thread panel */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            // Mobile: only show when thread is open
            !showThread || !selectedEntry ? "hidden lg:flex" : "flex",
          )}
        >
          <AnimatePresence mode="wait">
            {selectedEntry ? (
              <motion.div
                key={selectedEntry.principal.toString()}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <MessageThread
                  entry={selectedEntry}
                  messages={messages}
                  loading={messagesLoading}
                  myPrincipal={myPrincipal}
                  onSend={handleSend}
                  onBack={() => setShowThread(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-3 text-center px-6"
                data-ocid="chat.thread.empty_state"
              >
                <MessageCircle className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <NewMessageDialog
        open={newMsgOpen}
        onClose={() => setNewMsgOpen(false)}
        onStartChat={handleStartChat}
      />
    </div>
  );
}
