// Learning core on the dev page (ES modules over http). No "test" flag: the profile must really reach localStorage.
module.exports = { name: 'learning core (dev page): self-test, demo problems, progress survives a reload', page: 'index.html?quality=low', width: 640, height: 360, run: require('./_learning.cjs') };
