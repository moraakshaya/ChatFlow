import express from 'express';
import { createConversation, getConversations } from '../../../controllers/public/v1/conversation.controller.js';
import { apiAuthentication } from '../../../middleware/apiAuthentication.middleware.js';
import { requireScope } from '../../../middleware/apiAuthorization.middleware.js';
import { generalRateLimiter, perKeyRateLimiter } from '../../../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(generalRateLimiter);
router.use(apiAuthentication);
router.use(perKeyRateLimiter);

router.post('/', requireScope('conversations:write'), createConversation);
router.get('/', requireScope('conversations:read'), getConversations);

export default router;
