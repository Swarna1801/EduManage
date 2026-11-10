import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import PremiumLock from "../../components/PremiumLock";
import { canUseFeature } from "../../lib/planFeatures";
import { countUnreadChatThreads, isChatThreadUnread, markChatThreadSeen } from "../../lib/utils";

export default function TeacherChat() {
  const { user } = useAuth();
  const hasChat = canUseFeature(user?.plan, "chatRoom");
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const unreadThreadCount = countUnreadChatThreads(threads, "teacher", user?.school_id, user?.id);

  const loadThreads = async (preserveSelection = true) => {
    try {
      const response = await API.get("/teacher/chat/threads");
      const nextThreads = Array.isArray(response.data) ? response.data : [];
      setThreads(nextThreads);
      setError("");
      if (nextThreads.length === 0) {
        setSelectedThreadId("");
        setThreadMeta(null);
        setMessages([]);
        return;
      }
      if (!preserveSelection || !nextThreads.find((thread) => String(thread.student_id) === String(selectedThreadId))) {
        setSelectedThreadId(String(nextThreads[0].student_id));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chat room");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (studentId) => {
    if (!studentId) return;
    try {
      const response = await API.get(`/teacher/chat/messages/${studentId}`);
      const nextMessages = Array.isArray(response.data?.messages) ? response.data.messages : [];
      const nextThreadMeta = response.data?.thread || null;
      setMessages(nextMessages);
      setThreadMeta(nextThreadMeta);
      const latestParentMessage = [...nextMessages].reverse().find((message) => message.sender_role === "parent");
      if (nextThreadMeta?.student_id && latestParentMessage?.createdAt) {
        markChatThreadSeen("teacher", user?.school_id, user?.id, nextThreadMeta.student_id, latestParentMessage.createdAt);
      }
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages");
    }
  };

  useEffect(() => {
    if (!hasChat) {
      setLoading(false);
      return;
    }
    loadThreads(false);
  }, [hasChat]);

  useEffect(() => {
    if (!hasChat || !selectedThreadId) return;
    loadMessages(selectedThreadId);
  }, [hasChat, selectedThreadId]);

  useEffect(() => {
    if (!hasChat) return undefined;
    const intervalId = window.setInterval(() => {
      loadThreads();
      if (selectedThreadId) {
        loadMessages(selectedThreadId);
      }
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [hasChat, selectedThreadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !selectedThreadId) return;
    setSending(true);
    try {
      await API.post("/teacher/chat/messages", {
        student_id: Number(selectedThreadId),
        message: draft.trim(),
      });
      setDraft("");
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!hasChat) {
    return (
      <div>
        <div className="page-title">Chat Room</div>
        <div className="page-sub">Live parent-teacher messaging inside the portal</div>
        <PremiumLock feature="Live parent-teacher chat room with instant replies" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Chat Room</div>
      <div className="page-sub">Reply to parents for students in your class teacher section only</div>

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "#FCEBEB", color: "#8B1E1E", border: "1px solid #F5C2C2" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18, alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #eef1f7", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>Parent Chats</span>
            {unreadThreadCount > 0 ? <span className="badge badge-red">{unreadThreadCount} new</span> : null}
          </div>
          {loading ? (
            <div style={{ padding: 18, color: "#888" }}>Loading chats...</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 18, color: "#888" }}>No parent chat threads yet for your assigned students.</div>
          ) : (
            threads.map((thread) => {
              const isActive = String(thread.student_id) === String(selectedThreadId);
              const isUnread = isChatThreadUnread(thread, "teacher", user?.school_id, user?.id);
              return (
                <button
                  key={thread.student_id}
                  type="button"
                  onClick={() => setSelectedThreadId(String(thread.student_id))}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid #f3f4f8",
                    background: isActive ? "#E6F1FB" : "#fff",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#0C447C" }}>{thread.parent_name}</div>
                    {isUnread ? <span className="badge badge-red">New</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{thread.student_name} • {thread.class_label}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {thread.latest_message || "Open chat and reply"}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {!selectedThreadId || !threadMeta ? (
            <div style={{ padding: 30, color: "#888" }}>Choose a parent thread on the left to start chatting.</div>
          ) : (
            <>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid #eef1f7", background: "#F8FBFF" }}>
                <div style={{ fontWeight: 700 }}>{threadMeta.parent_name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{threadMeta.student_name} • {threadMeta.class_label}</div>
              </div>

              <div style={{ padding: 18, minHeight: 420, maxHeight: 520, overflowY: "auto", background: "#FCFDFF", display: "grid", gap: 10 }}>
                {messages.length === 0 ? (
                  <div style={{ color: "#888" }}>No messages yet. The parent can start the conversation, or you can send the first reply.</div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_role === "teacher";
                    return (
                      <div key={message.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "72%",
                            background: isMine ? "#DCF5E8" : "#EEF4FB",
                            color: "#223",
                            borderRadius: 16,
                            padding: "10px 12px",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: isMine ? "#1E6B52" : "#0C447C" }}>
                            {isMine ? "You" : threadMeta.parent_name}
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{message.message}</div>
                          <div style={{ fontSize: 11, color: "#777", marginTop: 6 }}>
                            {new Date(message.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} style={{ padding: 16, borderTop: "1px solid #eef1f7", display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your reply to the parent..."
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
