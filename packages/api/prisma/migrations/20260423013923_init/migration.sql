-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "release_date" TIMESTAMP(3),
    "budget" BIGINT,
    "runtime" INTEGER,
    "mpaa_rating" TEXT,
    "genres" TEXT[],
    "studio" TEXT,
    "franchise" TEXT,
    "tmdb_poster_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieMetadata" (
    "movie_id" INTEGER NOT NULL,
    "director" TEXT,
    "cast" TEXT[],
    "rt_score" INTEGER,
    "metacritic_score" INTEGER,
    "imdb_rating" DOUBLE PRECISION,
    "awards" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieMetadata_pkey" PRIMARY KEY ("movie_id")
);

-- CreateTable
CREATE TABLE "Gross" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "week_date" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "weekend_gross" BIGINT,
    "domestic_cumulative" BIGINT,
    "worldwide_gross" BIGINT,
    "theaters" INTEGER,
    "weeks_in_release" INTEGER,

    CONSTRAINT "Gross_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyChart" (
    "id" SERIAL NOT NULL,
    "chart_date" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "weekend_gross" BIGINT,
    "gross_change_pct" DOUBLE PRECISION,
    "cumulative_gross" BIGINT,
    "theaters" INTEGER,
    "weeks_in_release" INTEGER,

    CONSTRAINT "WeeklyChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "value" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "achieved_date" TIMESTAMP(3) NOT NULL,
    "is_all_time" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trivia" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" TEXT,
    "movie_id" INTEGER,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trivia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "username" TEXT,
    "movie_id" INTEGER NOT NULL,
    "predicted_opening" BIGINT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actual_opening" BIGINT,
    "accuracy_pct" DOUBLE PRECISION,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionScore" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "username" TEXT,
    "total_predictions" INTEGER NOT NULL DEFAULT 0,
    "avg_accuracy_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "best_accuracy_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdb_id_key" ON "Movie"("tmdb_id");

-- CreateIndex
CREATE INDEX "Movie_release_date_idx" ON "Movie"("release_date");

-- CreateIndex
CREATE INDEX "Movie_tmdb_id_idx" ON "Movie"("tmdb_id");

-- CreateIndex
CREATE INDEX "Gross_week_date_rank_idx" ON "Gross"("week_date", "rank");

-- CreateIndex
CREATE INDEX "Gross_movie_id_idx" ON "Gross"("movie_id");

-- CreateIndex
CREATE UNIQUE INDEX "Gross_movie_id_week_date_key" ON "Gross"("movie_id", "week_date");

-- CreateIndex
CREATE INDEX "WeeklyChart_chart_date_idx" ON "WeeklyChart"("chart_date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChart_chart_date_rank_key" ON "WeeklyChart"("chart_date", "rank");

-- CreateIndex
CREATE INDEX "Record_category_idx" ON "Record"("category");

-- CreateIndex
CREATE INDEX "Prediction_movie_id_idx" ON "Prediction"("movie_id");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionScore_session_id_key" ON "PredictionScore"("session_id");

-- AddForeignKey
ALTER TABLE "MovieMetadata" ADD CONSTRAINT "MovieMetadata_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gross" ADD CONSTRAINT "Gross_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyChart" ADD CONSTRAINT "WeeklyChart_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
