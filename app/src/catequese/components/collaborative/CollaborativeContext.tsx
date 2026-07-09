import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import type { ContentItem } from "wasp/entities";
import type { AiIntent, SessionContext } from "../../../shared/intent";
import {
  startCollaborativeSession,
  getSessionHistory,
  getContentVersions,
  saveContentVersion,
  restoreContentVersion,
  addContextAttachment,
  removeContextAttachment,
  getAiSuggestions,
  getAiCreditsStatus,
  getSessionContentItem,
} from "wasp/client/operations";
import { getSessionId } from "wasp/client/api";

export interface SessionMessage {
  id: string;
  createdAt: string;
  role: string;
  content: string;
}

export interface ContextAttachment {
  id: string;
  createdAt: string;
  type: string;
  title: string;
  sourceUrl?: string;
  payload: string;
}

export interface AiSuggestion {
  id: string;
  label: string;
  action: string;
  icon: string;
}

interface CollaborativeState {
  sessionId: string | null;
  contentItemId: string | null;
  contentItem: ContentItem | null;
  messages: SessionMessage[];
  attachments: ContextAttachment[];
  suggestions: AiSuggestion[];
  creditsLeft: number | null;
  generating: boolean;
  streamingBlock: string | null;
  depth: number;
  setupComplete: boolean;
  intent: AiIntent | null;
  manualCreation: boolean;
}

interface CollaborativeContextType extends CollaborativeState {
  startSession: (ctx: SessionContext) => Promise<void>;
  setIntent: (intent: AiIntent) => void;
  sendMessage: (message: string) => Promise<void>;
  generateBlock: (blockField: string, instruction?: string) => Promise<void>;
  adjustDepth: (depth: number) => Promise<void>;
  addAttachment: (
    type: string,
    title: string,
    payload: string,
    sourceUrl?: string,
  ) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;
  refreshSuggestions: () => Promise<void>;
  refreshVersions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  setContentItem: (item: ContentItem) => void;
  refreshContentItem: () => Promise<void>;
  saveContentVersion: (args: {
    contentItemId: string;
    changeNotes?: string;
  }) => Promise<void>;
  getContentVersions: (args: { contentItemId: string }) => Promise<any[]>;
  restoreContentVersion: (args: {
    versionId: string;
  }) => Promise<{ success: boolean }>;
}

const CollaborativeContext = createContext<CollaborativeContextType | null>(
  null,
);

export function CollaborativeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollaborativeState>({
    sessionId: null,
    contentItemId: null,
    contentItem: null,
    messages: [],
    attachments: [],
    suggestions: [],
    creditsLeft: null,
    generating: false,
    streamingBlock: null,
    depth: 3,
    setupComplete: false,
    intent: null,
    manualCreation: false,
  });

  const navigate = useNavigate();

  const refreshContentItem = useCallback(async () => {
    const cid = state.contentItemId;
    if (!cid) return;
    try {
      const fresh = await getSessionContentItem({ contentItemId: cid });
      setState((s) => ({ ...s, contentItem: fresh as unknown as ContentItem }));
    } catch {}
  }, [state.contentItemId]);

  const startSession = useCallback(async (ctx: SessionContext) => {
    setState((s) => ({
      ...s,
      generating: true,
      intent: ctx.intent,
      manualCreation: !!ctx.manualCreation,
    }));
    try {
      const result = await startCollaborativeSession({
        theme: ctx.theme,
        ageGroup: ctx.ageGroup,
        duration: ctx.duration,
        approach: ctx.approach,
        intent: ctx.intent,
        contentId: ctx.contentId ?? undefined,
        meetingId: ctx.meetingId ?? undefined,
        applyToOriginal: ctx.applyToOriginal,
        manualCreation: ctx.manualCreation,
      } as any);
      const typedResult = result as unknown as {
        sessionId: string;
        contentItemId: string;
        contentItem: ContentItem;
        attachments?: ContextAttachment[];
      };
      setState((s) => ({
        ...s,
        sessionId: typedResult.sessionId,
        contentItemId: typedResult.contentItemId,
        contentItem: typedResult.contentItem,
        attachments: typedResult.attachments || [],
        setupComplete: true,
        generating: false,
        manualCreation: !!ctx.manualCreation,
      }));

      if (!ctx.manualCreation) {
        try {
          const credits = await getAiCreditsStatus();
          setState((s) => ({ ...s, creditsLeft: credits.creditsLeft }));
        } catch {}
      } else {
        setState((s) => ({ ...s, creditsLeft: null }));
      }
    } catch (err: any) {
      setState((s) => ({ ...s, generating: false }));
      throw err;
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!state.sessionId) return;
      const userMsg: SessionMessage = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        role: "user",
        content: message,
      };
      setState((s) => ({ ...s, messages: [...s.messages, userMsg] }));

      const assistantId = (Date.now() + 1).toString();
      const assistantMsg: SessionMessage = {
        id: assistantId,
        createdAt: new Date().toISOString(),
        role: "assistant",
        content: "",
      };
      setState((s) => ({ ...s, messages: [...s.messages, assistantMsg] }));

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const authSessionId = getSessionId();
        if (authSessionId) headers["Authorization"] = `Bearer ${authSessionId}`;
        const response = await fetch("/api/collaborative-chat-stream", {
          method: "POST",
          headers,
          body: JSON.stringify({ sessionId: state.sessionId, message }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue;
              }
              if (data.error) {
                streamError = data.error;
                break;
              }
              if (data.chunk) {
                setState((s) => ({
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + data.chunk }
                      : m,
                  ),
                }));
              }
              if (data.done) break;
            }
          }
          if (streamError) break;
        }

        if (streamError) {
          setState((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Erro: ${streamError}` }
                : m,
            ),
          }));
        }
      } catch (err: any) {
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Erro: ${err.message}` }
              : m,
          ),
        }));
      }
      refreshContentItem();
    },
    [state.sessionId, refreshContentItem],
  );

  const generateBlock = useCallback(
    async (blockField: string, instruction?: string) => {
      if (!state.sessionId) return;
      setState((s) => ({ ...s, streamingBlock: blockField }));

      try {
        const response = await fetch("/api/generate-block-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            blockField,
            instruction,
          }),
          credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue;
              }
              if (data.error) {
                streamError = data.error;
                break;
              }
              if (data.chunk) {
                // Streaming content updates handled by content refresh
              }
              if (data.done) {
                setState((s) => ({ ...s, streamingBlock: null }));
              }
            }
          }
          if (streamError) break;
        }

        if (streamError) {
          throw new Error(streamError);
        }
      } catch (err: any) {
        setState((s) => ({ ...s, streamingBlock: null }));
      } finally {
        setState((s) => ({ ...s, streamingBlock: null }));
      }
      refreshContentItem();
    },
    [state.sessionId, refreshContentItem],
  );

  const adjustDepth = useCallback(
    async (depth: number) => {
      if (!state.sessionId) return;
      setState((s) => ({ ...s, depth, generating: true }));

      try {
        const response = await fetch("/api/adjust-depth-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: state.sessionId, depth }),
          credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue;
              }
              if (data.error) {
                streamError = data.error;
                break;
              }
              if (data.done) {
                setState((s) => ({ ...s, generating: false }));
              }
            }
          }
          if (streamError) break;
        }

        if (streamError) {
          throw new Error(streamError);
        }
      } catch (err: any) {
        setState((s) => ({ ...s, generating: false }));
      } finally {
        setState((s) => ({ ...s, generating: false }));
      }
      refreshContentItem();
    },
    [state.sessionId, refreshContentItem],
  );

  const addAttachment = useCallback(
    async (
      type: string,
      title: string,
      payload: string,
      sourceUrl?: string,
    ) => {
      if (!state.sessionId) return;
      try {
        const result = await addContextAttachment({
          sessionId: state.sessionId,
          type,
          title,
          payload,
          sourceUrl,
        });
        setState((s) => ({
          ...s,
          attachments: [
            ...s.attachments,
            result as unknown as ContextAttachment,
          ],
        }));
      } catch {}
    },
    [state.sessionId],
  );

  const removeAttachment = useCallback(async (attachmentId: string) => {
    try {
      await removeContextAttachment({ attachmentId });
      setState((s) => ({
        ...s,
        attachments: s.attachments.filter((a) => a.id !== attachmentId),
      }));
    } catch {}
  }, []);

  const refreshSuggestions = useCallback(async () => {
    if (!state.sessionId) return;
    try {
      const results = await getAiSuggestions({ sessionId: state.sessionId });
      setState((s) => ({
        ...s,
        suggestions: results as unknown as AiSuggestion[],
      }));
    } catch {}
  }, [state.sessionId]);

  const refreshVersions = useCallback(async () => {
    // Version refresh will be handled by the VersionHistoryPanel
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setState((s) => ({ ...s, sessionId, setupComplete: true }));
    try {
      const msgs = await getSessionHistory({ sessionId });
      setState((s) => ({
        ...s,
        messages: msgs as unknown as SessionMessage[],
      }));
    } catch {}
  }, []);

  const setContentItem = useCallback((item: ContentItem) => {
    setState((s) => ({ ...s, contentItem: item }));
  }, []);

  const setIntent = useCallback((intent: AiIntent) => {
    setState((s) => ({ ...s, intent }));
  }, []);

  const saveVersion = useCallback(
    async (args: { contentItemId: string; changeNotes?: string }) => {
      return saveContentVersion(args);
    },
    [],
  );

  const getVersions = useCallback(async (args: { contentItemId: string }) => {
    return getContentVersions(args) as Promise<any[]>;
  }, []);

  const restoreVersion = useCallback(async (args: { versionId: string }) => {
    return restoreContentVersion(args);
  }, []);

  return (
    <CollaborativeContext.Provider
      value={{
        ...state,
        startSession,
        setIntent,
        sendMessage,
        generateBlock,
        adjustDepth,
        addAttachment,
        removeAttachment,
        refreshSuggestions,
        refreshVersions,
        loadSession,
        setContentItem,
        refreshContentItem,
        saveContentVersion: saveVersion,
        getContentVersions: getVersions,
        restoreContentVersion: restoreVersion,
      }}
    >
      {children}
    </CollaborativeContext.Provider>
  );
}

export function useCollaborative() {
  const ctx = useContext(CollaborativeContext);
  if (!ctx)
    throw new Error(
      "useCollaborative must be used within CollaborativeProvider",
    );
  return ctx;
}
