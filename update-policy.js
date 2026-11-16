// Pure update decisions. Kept separate so migration behavior is regression-tested.
export function decidePromptUpdate({ exists, currentHash, previousOfficialHash, shippedHash }) {
    if (!exists) return 'install';
    if (!previousOfficialHash) return currentHash === shippedHash ? 'adopt' : 'conflict';
    if (previousOfficialHash === shippedHash) return 'none';
    return currentHash === previousOfficialHash ? 'update' : 'conflict';
}
