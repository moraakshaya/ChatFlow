import express from 'express';
import { sendMessage, getMessages } from '../../../controllers/public/v1/message.controller.js';
import { apiAuthentication } from '../../../middleware/apiAuthentication.middleware.js';
import { requireScope } from '../../../middleware/apiAuthorization.middleware.js';
import { messageRateLimiter, generalRateLimiter, perKeyRateLimiter } from '../../../middleware/rateLimit.middleware.js';

const router = express.Router({ mergeParams: true });

router.use(generalRateLimiter); // IP based before auth
router.use(apiAuthentication);
router.use(perKeyRateLimiter); // Key based after auth

router.post('/', messageRateLimiter, requireScope('messages:write'), sendMessage);
router.get('/', requireScope('messages:read'), getMessages);

export default router;
