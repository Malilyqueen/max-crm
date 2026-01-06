const activity = [];
function push (evt){ activity.push({ ...evt, ts:Date.now() }); }
function list (){ return activity.slice(-200); }
export default { push, list };