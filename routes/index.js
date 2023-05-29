var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get("/movies/search", async function (req, res, next) {
  let title = req.query.title;
  let year = req.query.year;
  let page = req.query.page;
  if (title === undefined){title=""};
  if (year === undefined){year=""};
  if (page === undefined){page=1};

  try {
    if (isNaN(page)) throw "Invalid page format. page must be a number.";
    if ((isNaN(year) | year.length !== 4) & year !== "") throw "Invalid year format. Format must be yyyy.";
    page = parseInt(page);

    const dataQuery = await req.db.from("basics")
      .select("primaryTitle", "year", "tconst", "imdbRating", "rottentomatoesRating", "metacriticRating", "rated")
      .where("primaryTitle","like", "%" + title + "%")
      .where("year","like","%"+year+"%")
      .offset((page-1)*100)
      .limit("100");

    const paginationQuery = await req.db.from("basics")
      .count("tconst", {as: 'total'})
      .where("primaryTitle","like", "%" + title + "%")
      .where("year","like","%"+year+"%");

    const data = dataQuery.map( movie => {
      return{
        title: movie.primaryTitle,
        year: movie.year,
        imdbID: movie.tconst,
        imdbRating: parseFloat(movie.imdbRating),
        rottenTomatoesRating: parseInt(movie.rottentomatoesRating),
        metacriticRating: parseInt(movie.metacriticRating),
        classification: movie.rated
      }
    });

    const pagination = {
      total: paginationQuery[0].total,
      lastPage: Math.ceil((paginationQuery[0].total)/100),
      prevPage: page-1>0? page-1 : null,
      nextPage: page+1<Math.ceil(paginationQuery[0].total/100)? page+1 : null,
      perPage: 100,
      currentPage: page,
      from: (page-1)*100,
      to: dataQuery.length + (page-1)*100
    };
    
    res.json({
      data: data,
      pagination: pagination
    });

  } catch (error) {
    res.status(400)
    res.send({ error: true, message: error });
  }
});

router.get('/movies/data/:id', async function(req, res, next) {
  const id = req.params.id;

  try{
    if (Object.keys(req.query).length !== 0) throw {status: 400, message: "Invalid query parameters. Query parameters are not permitted."};
    
    if (id.length > 9 | id.length === 0) throw {status: 400, message: "You must supply an imdbID!"};

    const dataQuery = await req.db.from("basics")
        .select("primaryTitle", "year", "runtimeMinutes", "genres", "country", "imdbRating", "rottentomatoesRating", "metacriticRating", "rated", "poster", "plot", "boxoffice")
        .where("tconst", "=",  id)

    if (Object.keys(dataQuery).length === 0) throw {status: 404, message: "No record exists of a movie with this ID"};

    const principalQuery = await req.db.from("principals")
    .select("nconst", "category", "name", "characters")
    .where("tconst", "=",  id)

    const data = dataQuery[0];

    const principals = principalQuery.map(principal => { 
      let characters = []
      if(principal.characters != ""){
        characters = (JSON.parse(principal.characters))
      }
      return {
        id: principal.nconst,
        category: principal.category,
        name: principal.name,
        characters: characters
      }
    })

    const ratings = [];

    if((data.imdbRating) !== null){
      ratings.push({
      source: "Internet Movie Database",
      value: parseFloat(data.imdbRating)
    })}
    if(data.rottentomatoesRating !== null){
      ratings.push({
      source: "Rotten Tomatoes",
      value: parseInt(data.rottentomatoesRating)
    })}
    if(data.metacriticRating !== null){
      ratings.push({
      source: "Metacritic",
      value: parseInt(data.metacriticRating)
    })}
    
    res.json({
      title: data.primaryTitle,
      year: data.year,
      runtime: data.runtimeMinutes,
      genres: data.genres.split(","),
      country: data.country,
      principals: principals,
      ratings: ratings,
      boxoffice: data.boxoffice,
      poster: data.poster,
      plot: data.plot
    });

  } catch (error) {
    res.status(error.status)
    res.send({ error: true, message: error.message });
  }
});

module.exports = router;
