var express = require('express');
var router = express.Router();
const authorization = require("../middleware/authorization");

router.get('/:id', authorization, async function(req, res, next) {
    const id = req.params.id;

    try{
        if (Object.keys(req.query).length !== 0) throw {status: 400, message: "Query parameters are not permitted."};

        const dataQuery = await req.db.from("names")
        .select("primaryName", "birthYear", "deathYear")
        .where("nconst", "=", id)
        
        if (Object.keys(dataQuery).length === 0) throw {status: 404, message: "No record exists of a movie with this ID"};

        const actorData = dataQuery[0]

        const roleQuery =  await req.db.from("principals")
        .select("tconst", "category", "characters")
        .where("nconst", "=", id)

        const roles = await Promise.all(roleQuery.map(async role =>{
        const characters = (JSON.parse(role.characters))

        const movieQuery = await req.db.from("basics")
            .select("primaryTitle", "imdbRating")
            .where("tconst", "=",  role.tconst)

        const movieData = movieQuery[0]

        return{
            movieName: movieData.primaryTitle,
            movieId: role.tconst,
            category: role.category,
            characters: characters,
            imdbRating: parseFloat(movieData.imdbRating)
        }
        }))

        res.status(200)
        res.json({
        name: actorData.primaryName,
        birthYear: actorData.birthYear,
        deathYear: actorData.deathYear,
        roles: roles
        })

    } catch (error) {
        res.status(error.status)
        res.send({ error: true, message: error.message });
    }
});
  
module.exports = router;
