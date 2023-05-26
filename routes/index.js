var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get("/movies/search", async function (req, res, next) {
  let title = req.query.title
  let year = req.query.year
  let page = req.query.page
  if (title === undefined){title=""}
  if (year === undefined){year=""}
  if (page === undefined){page=1}
  console.log(title, year, page)

  try {
    const dataQuery = await req.db.from("basics")
      .select("primaryTitle", "year", "tconst", "imdbRating", "rottentomatoesRating", "metacriticRating", "rated")
      .where("primaryTitle","like", "%" + title + "%")
      .where("year","like","%"+year+"%")
      .offset((page-1)*100)
      .limit("100");

    const paginationQuery = await req.db.from("basics")
      .select("primaryTitle", "year", "tconst", "imdbRating", "rottentomatoesRating", "metacriticRating", "rated")
      .where("primaryTitle","like", "%" + title + "%")
      .where("year","like","%"+year+"%")
      .offset((page-1)*100)
      .limit("100");
    
      res.json(dataQuery)
  } catch (error) {
    console.log(error);
    res.json({ Error: true, Message: "Error in MySQL query" });
  }
});

module.exports = router;
