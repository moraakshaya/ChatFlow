export default {
    // Client to Server
    JOIN_CONVERSATION: 'join_conversation',
    LEAVE_CONVERSATION: 'leave_conversation',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop',
    
    // Presence
    PRESENCE_GET: 'presence:get',
    PRESENCE_STATE: 'presence:state',
    PRESENCE_ONLINE: 'presence:online',
    PRESENCE_OFFLINE: 'presence:offline',

    // Server to Client
    NEW_MESSAGE: 'new_message',
    MESSAGE_UPDATED: 'message_updated',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_REACTION: 'message_reaction',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
    ERROR: 'socket_error',

    // Read Receipts
    READ_MESSAGE: 'read:message',
    MESSAGE_READ: 'message:read',

    // Message Reactions
    REACTION_ADD: 'reaction:add',
    REACTION_REMOVE: 'reaction:remove',
    REACTION_ADDED: 'reaction:added',
    REACTION_REMOVED: 'reaction:removed',
    REACTION_ERROR: 'reaction:error',

    // Notifications
    NOTIFICATION_NEW: 'notification:new',

    // Unread Counters
    UNREAD_UPDATE: 'unread:update',

    // Conversation Updates
    CONVERSATION_UPDATED: 'conversation:updated',
    CONVERSATION_ARCHIVED: 'conversation:archived',
    CONVERSATION_DELETED: 'conversation:deleted'
};
