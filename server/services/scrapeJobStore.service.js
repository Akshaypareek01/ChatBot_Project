/** In-memory scrape job progress (per jobId). Reset on server restart. */
const jobs = new Map();

function createJob(userId, url, maxDepth) {
    const jobId = require('crypto').randomBytes(12).toString('hex');
    jobs.set(jobId, {
        jobId,
        userId: userId.toString(),
        url,
        maxDepth,
        status: 'starting',
        pagesFound: 0,
        pagesScraped: 0,
        sourceId: null,
        error: null,
        createdAt: new Date()
    });
    return jobId;
}

function getJob(jobId) {
    return jobs.get(jobId) || null;
}

function updateProgress(jobId, data) {
    const job = jobs.get(jobId);
    if (!job) return;
    if (data.pagesFound != null) job.pagesFound = data.pagesFound;
    if (data.pagesScraped != null) job.pagesScraped = data.pagesScraped;
    if (data.status != null) job.status = data.status;
    if (data.sourceId != null) job.sourceId = data.sourceId;
    if (data.error != null) job.error = data.error;
}

function setJobDone(jobId, sourceId) {
    updateProgress(jobId, { status: 'done', sourceId });
}

function setJobFailed(jobId, error) {
    updateProgress(jobId, { status: 'failed', error: error.message || String(error) });
}

module.exports = { createJob, getJob, updateProgress, setJobDone, setJobFailed };
