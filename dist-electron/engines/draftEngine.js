"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCpuAuctionForPlayer = simulateCpuAuctionForPlayer;
const MIN_BID_INCREMENT = 10;
const MIN_RESERVE_PER_EMPTY_SLOT = 20;
function simulateCpuAuctionForPlayer(player, teams, chemistryLookup) {
    if (player.isCaptain) {
        throw new Error(`Safeguard violation: Captain ${player.displayName} cannot enter the auction pool.`);
    }
    // Calculate each eligible team's private maximum valuation and narrative reason
    const valuations = [];
    for (const t of teams) {
        const spotsLeft = t.rosterLimit - t.rosterPlayerIds.length;
        if (spotsLeft <= 0)
            continue;
        // Safeguard: Must reserve enough credits to fill remaining empty slots after this pick
        const maxAffordable = t.budgetRemaining - (spotsLeft - 1) * MIN_RESERVE_PER_EMPTY_SLOT;
        if (maxAffordable < MIN_RESERVE_PER_EMPTY_SLOT)
            continue;
        let score = player.currentMarketValue;
        const reasons = [];
        // 1. Captain & Roster Chemistry check
        const capChem = chemistryLookup(t.captainPlayerId, player.playerId);
        let rosterGoodLinks = 0;
        let rosterBadLinks = 0;
        for (const mateId of t.rosterPlayerIds) {
            const c = chemistryLookup(mateId, player.playerId);
            if (c === 'Good')
                rosterGoodLinks++;
            if (c === 'Bad')
                rosterBadLinks++;
        }
        if (capChem === 'Good') {
            const bonus = t.cpuPersonality === 'Chemistry-focused' ? 65 : 35;
            score += bonus;
            reasons.push({ weight: bonus, text: 'This player has strong musical-note chemistry with the team captain.' });
        }
        else if (capChem === 'Bad') {
            score -= 45;
        }
        if (rosterGoodLinks >= 2) {
            score += rosterGoodLinks * 18;
            reasons.push({
                weight: rosterGoodLinks * 18,
                text: `Creates ${rosterGoodLinks} Good Chemistry links with existing roster members.`
            });
        }
        if (rosterBadLinks > 0) {
            score -= rosterBadLinks * 15;
        }
        // 2. Roster Weakness & Positional Need analysis
        if (t.avgBat < 6.0 && player.currBat >= 8) {
            score += 40;
            reasons.push({ weight: 40, text: 'The team needs another power hitter to boost a weak lineup.' });
        }
        if (t.avgPitch < 6.0 && player.currPitch >= 7) {
            score += 42;
            reasons.push({ weight: 42, text: 'The team needs to improve its pitching rotation.' });
        }
        if (t.avgField < 5.8 && player.currField >= 7) {
            score += 30;
            reasons.push({ weight: 30, text: 'Targets elite defensive fielding to shore up the infield.' });
        }
        // 3. CPU Personality Modifiers
        switch (t.cpuPersonality) {
            case 'Power-focused':
                if (player.archetype === 'Power' || player.currBat >= 8) {
                    score += 38;
                    reasons.push({ weight: 38, text: 'Matches the franchise’s Power-focused offensive identity.' });
                }
                break;
            case 'Speed-focused':
                if (player.archetype === 'Speed' || player.currRun >= 8) {
                    score += 38;
                    reasons.push({ weight: 38, text: 'Fits the franchise’s high-tempo Speed & baserunning strategy.' });
                }
                break;
            case 'Conservative spender':
                score = Math.round(score * 0.85);
                reasons.push({ weight: 25, text: 'Value-disciplined bid protecting remaining virtual budget.' });
                break;
            case 'Aggressive bidder':
                if (player.currBat + player.currPitch + player.currField + player.currRun >= 24) {
                    score = Math.round(score * 1.18);
                    reasons.push({ weight: 35, text: 'Aggressive front office pushing hard for top-tier talent.' });
                }
                break;
            case 'Balanced':
                if (player.archetype === 'Balanced') {
                    score += 20;
                    reasons.push({ weight: 20, text: 'Provides balanced four-tool ratings across all categories.' });
                }
                break;
        }
        reasons.sort((a, b) => b.weight - a.weight);
        const clampedMax = Math.max(MIN_RESERVE_PER_EMPTY_SLOT, Math.min(maxAffordable, Math.round(score / 10) * 10));
        valuations.push({
            team: t,
            maxBid: clampedMax,
            primaryReason: reasons[0]?.text ||
                `Solid value acquisition (${player.archetype}) to fill ${spotsLeft} remaining roster spots.`
        });
    }
    if (valuations.length === 0) {
        throw new Error('No team has available roster spots and budget to bid.');
    }
    valuations.sort((a, b) => b.maxBid - a.maxBid);
    const top = valuations[0];
    const runnerUp = valuations[1];
    const bidSteps = [];
    let currentBid = Math.max(20, Math.round((player.currentMarketValue * 0.5) / 10) * 10);
    let activeBidders = valuations.filter((v) => v.maxBid >= currentBid);
    if (activeBidders.length === 0) {
        activeBidders = [top];
        currentBid = Math.min(20, top.maxBid);
    }
    let lastWinner = top;
    while (true) {
        const eligible = valuations.filter((v) => v.maxBid >= currentBid);
        if (eligible.length === 0)
            break;
        for (const bidder of eligible) {
            if (bidSteps.length > 0 && bidSteps[bidSteps.length - 1].teamId === bidder.team.teamId) {
                continue;
            }
            if (bidder.maxBid >= currentBid) {
                bidSteps.push({
                    teamId: bidder.team.teamId,
                    franchiseName: bidder.team.franchiseName,
                    bidAmount: currentBid,
                    reason: bidder.primaryReason
                });
                lastWinner = bidder;
                currentBid += MIN_BID_INCREMENT;
            }
        }
        if (eligible.length <= 1 || currentBid > top.maxBid)
            break;
    }
    const finalStep = bidSteps[bidSteps.length - 1] || {
        teamId: top.team.teamId,
        franchiseName: top.team.franchiseName,
        bidAmount: Math.min(top.maxBid, runnerUp ? runnerUp.maxBid + MIN_BID_INCREMENT : 30),
        reason: top.primaryReason
    };
    return {
        playerId: player.playerId,
        winningTeamId: finalStep.teamId,
        winningBid: finalStep.bidAmount,
        finalExplanation: lastWinner.primaryReason,
        bidSteps
    };
}
