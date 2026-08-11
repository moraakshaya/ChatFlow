import messageSearchService from "../services/messageSearch.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Search messages based on scoped authorization
// @route   GET /api/search/messages
// @access  Private
export const searchMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // In a multi-tenant platform, typically an organizationId context is provided 
    // in the headers or the session to scope the current view.
    // For this implementation, we can extract it if provided in query, otherwise
    // the service handles cross-org scopes or default scopes based on membership.
    const organizationId = req.headers["x-organization-id"] || req.query.organizationId;
    
    // Pass raw query params as filters
    const filters = req.query;
    
    // The service handles scope resolution, authorization mapping, and query construction
    const result = await messageSearchService.search({
        userId,
        organizationId,
        filters
    });

    res.status(200).json({
        success: true,
        data: result
    });
});
