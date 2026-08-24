import ActivityLog from "../models/ActivityLog.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get activity logs for the organization
// @route   GET /api/activity-logs
// @access  Private (Admin/Owner)
export const getLogs = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Optional filters
    const filter = { organizationId };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.action) filter.action = req.query.action;

    const total = await ActivityLog.countDocuments(filter);
    
    const logs = await ActivityLog.find(filter)
        .sort({ createdAt: -1 }) // Newest first
        .skip(startIndex)
        .limit(limit)
        .populate("userId", "fullName avatar email")
        .lean();

    res.status(200).json({
        success: true,
        count: logs.length,
        total,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        },
        data: logs,
    });
});
