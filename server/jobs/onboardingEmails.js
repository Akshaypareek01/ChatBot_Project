/**
 * Phase 3.2: Send onboarding email sequence (Day 1, 3, 7) to new users.
 * Run daily (e.g. once per day). Users are matched by createdAt + not yet sent.
 */

const User = require('../models/User');
const emailService = require('../services/email.service');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Window: e.g. day 1 = users who signed up between 24h and 48h ago (so we send once per cohort)
function dayWindow(day) {
    const now = Date.now();
    const start = now - (day + 1) * MS_PER_DAY;
    const end = now - day * MS_PER_DAY;
    return { $gte: new Date(start), $lte: new Date(end) };
}

async function runOnboardingEmails() {
    const now = new Date();

    // Day 1: createdAt between 24h and 36h ago, day1 not sent
    const day1Users = await User.find({
        role: 'user',
        isVerified: true,
        createdAt: dayWindow(1),
        $or: [{ 'onboardingEmailSent.day1': { $exists: false } }, { 'onboardingEmailSent.day1': null }]
    }).select('email name').lean();

    for (const u of day1Users) {
        try {
            await emailService.sendOnboardingDay1Email(u.email, u.name);
            await User.updateOne(
                { _id: u._id },
                { $set: { 'onboardingEmailSent.day1': now } }
            );
        } catch (err) {
            console.error('Onboarding Day 1 email failed for', u.email, err.message);
        }
    }

    // Day 3
    const day3Users = await User.find({
        role: 'user',
        isVerified: true,
        createdAt: dayWindow(3),
        'onboardingEmailSent.day1': { $ne: null },
        $or: [{ 'onboardingEmailSent.day3': { $exists: false } }, { 'onboardingEmailSent.day3': null }]
    }).select('email name').lean();

    for (const u of day3Users) {
        try {
            await emailService.sendOnboardingDay3Email(u.email, u.name);
            await User.updateOne(
                { _id: u._id },
                { $set: { 'onboardingEmailSent.day3': now } }
            );
        } catch (err) {
            console.error('Onboarding Day 3 email failed for', u.email, err.message);
        }
    }

    // Day 7
    const day7Users = await User.find({
        role: 'user',
        isVerified: true,
        createdAt: dayWindow(7),
        'onboardingEmailSent.day3': { $ne: null },
        $or: [{ 'onboardingEmailSent.day7': { $exists: false } }, { 'onboardingEmailSent.day7': null }]
    }).select('email name').lean();

    for (const u of day7Users) {
        try {
            await emailService.sendOnboardingDay7Email(u.email, u.name);
            await User.updateOne(
                { _id: u._id },
                { $set: { 'onboardingEmailSent.day7': now } }
            );
        } catch (err) {
            console.error('Onboarding Day 7 email failed for', u.email, err.message);
        }
    }

    if (day1Users.length || day3Users.length || day7Users.length) {
        console.log(`Onboarding emails: Day1=${day1Users.length} Day3=${day3Users.length} Day7=${day7Users.length}`);
    }
}

module.exports = { runOnboardingEmails };
