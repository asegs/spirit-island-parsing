const landMappings = {
    ter: (land) => {return land.terrain},
    adj: (land) => {return land.adjacents},
    bli: (land) => {return land.blight},
    trp: (land) => {return land.troops},
    twn: (land) => {return land.towns},
    cit: (land) => {return land.cities},
    dah: (land) => {return land.dahan},
    set: (land) => {return [land]},
    fer: (land, fear) => {main.fear += fear},
    dmg: (land,amount,...types) => {
        return {
            type: "dmg",
            state: "open",
            land: land,
            amount: amount,
            types: types.includes("A") ? ["C", "T", "S"] : types
        }
    },
    def: (land, amount) => {
        return  {
            type: "def",
            state: "open",
            land: land,
            amount: amount
        }
    },
    rep: (land,from,to,fromCount=1,toCount=1) => {
        land[tokens[from]] -= parseInt(fromCount);
        land[tokens[to]] += parseInt(toCount);
        return {
            type: "rep",
            land: land,
            state: "closed"
        }
    }
}

const tokens = {
    C: "cities",
    T: "towns",
    S: "troops",
    D: "dahan",
    B: "blight",
    A: "all"

}

const terrain = {
    O: "ocean",
    W: "wetland",
    M: "mountain",
    J: "jungle",
    S: "sands"
}

const numOrElse = (n,nElse) => isNaN(n) ? nElse : n

const higherOrder = {
    sum: (arr) => {return arr.reduce((a, b) => (numOrElse(a,1) + numOrElse(b,1)),0)},
    ftr: (arr,to) => {return arr.filter(a=>{return to.includes(a.terrain)})}
}

module.exports = { landMappings, tokens, terrain, higherOrder };
