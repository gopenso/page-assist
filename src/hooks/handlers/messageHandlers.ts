import { type ChatHistory, type Message } from "~/store/option"
import {
  deleteChatForEdit, 
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { validateBeforeSubmit } from "../utils/messageHelpers"

export const createRegenerateLastMessage = ({
  validateBeforeSubmitFn,
  history,
  messages,
  setHistory,
  setMessages,
  historyId,
  removeMessageUsingHistoryIdFn,
  onSubmit
}: {
  validateBeforeSubmitFn: () => boolean
  history: ChatHistory
  messages: Message[]
  setHistory: (history: ChatHistory) => void
  setMessages: (messages: Message[]) => void
  historyId: string | null
  removeMessageUsingHistoryIdFn: (id: string | null) => Promise<void>
  onSubmit: (params: any) => Promise<void>
}) => {
  return async () => {
    const isOk = validateBeforeSubmitFn()

    if (!isOk) {
      return
    }
    if (history.length > 0) {
      const lastMessage = history[history.length - 2]
      let newHistory = history.slice(0, -2)
      let mewMessages = messages
      mewMessages.pop()
      setHistory(newHistory)
      setMessages(mewMessages)
      await removeMessageUsingHistoryIdFn(historyId)
      if (lastMessage.role === "user") {
        const newController = new AbortController()
        await onSubmit({
          message: lastMessage.content,
          image: lastMessage.image || "",
          isRegenerate: true,
          memory: newHistory,
          controller: newController
        })
      }
    }
  }
}

export const createEditMessage = ({
  messages,
  history,
  setMessages,
  setHistory,
  historyId,
  validateBeforeSubmitFn,
  onSubmit
}: {
  messages: Message[]
  history: ChatHistory
  setMessages: (messages: Message[]) => void
  setHistory: (history: ChatHistory) => void
  historyId: string | null
  validateBeforeSubmitFn: () => boolean
  onSubmit: (params: any) => Promise<void>
}) => {
  return async (
    index: number,
    message: string,
    isHuman: boolean,
    isSend: boolean
  ) => {
    let newMessages = messages
    let newHistory = history

    // if human message and send then only trigger the submit
    if (isHuman && isSend) {
      const isOk = validateBeforeSubmitFn()

      if (!isOk) {
        return
      }

      const currentHumanMessage = newMessages[index]
      newMessages[index].message = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
      return
    }
    newMessages[index].message = message
    setMessages(newMessages)
    newHistory[index].content = message
    setHistory(newHistory)
    await updateMessageByIndex(historyId, index, message)
  }
}

export const createStopStreamingRequest = (
  abortController: AbortController | null,
  setAbortController: (controller: AbortController | null) => void
) => {
  return () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }
}
