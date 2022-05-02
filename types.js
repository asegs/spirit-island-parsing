const Land = (terrain,adjacents,blight=0,towns=0,cities=0,dahan=0) => {
    return {
        terrain: terrain,
        adjacents: adjacents,
        blight: blight,
        troops: 0,
        towns: towns,
        cities: cities,
        dahan: dahan
    }
}

const Global = (blight) => {
    return {
        fear: 0,
        blight: blight
    }
}

module.exports = {Land, Global}