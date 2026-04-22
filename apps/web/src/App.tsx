import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Weekly from "./pages/Weekly";
import Yearly from "./pages/Yearly";
import Movie from "./pages/Movie";
import Search from "./pages/Search";
import Records from "./pages/Records";
import Trivia from "./pages/Trivia";
import Predictions from "./pages/Predictions";
import Upcoming from "./pages/Upcoming";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="weekly" element={<Weekly />} />
          <Route path="yearly/:year?" element={<Yearly />} />
          <Route path="movie/:id" element={<Movie />} />
          <Route path="search" element={<Search />} />
          <Route path="records" element={<Records />} />
          <Route path="trivia" element={<Trivia />} />
          <Route path="predict" element={<Predictions />} />
          <Route path="upcoming" element={<Upcoming />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
