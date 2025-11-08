"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ResultPage = () => {
  const params = useParams(); // Next.js params
  const polyid = params.polyid; // if your route is /results/[polyid]

  const [soilData, setSoilData] = useState(null);
  const [polygonData, setPolygonData] = useState(null);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);

  useEffect(() => {
    if (!polyid) return;
    console.log(polyid);

    const fetchData = async () => {
      try {
        // setLoading(true);

        const soilRes = await fetch(`http://localhost:5000/api/soil/${polyid}`);
        const soilJson = await soilRes.json();
        console.log(soilJson);
        setSoilData(soilJson);
        console.log(soilData);

        const polyRes = await fetch(
          `http://localhost:5000/api/soil/polygon/${polyid}`
        );
        const polyJson = await polyRes.json();
        setPolygonData(polyJson);
        console.log(polygonData);

        // setLoading(false);
      } catch (err) {
        console.error(err);
        // setError("Failed to fetch data");
        // setLoading(false);
      }
    };

    fetchData();
  }, [polyid]);

  // if (loading) return <div>Loading...</div>;
  // if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Results for Polygon: {polyid}</h1>

      <section>
        <h2>Basic Soil Data</h2>
        {soilData ? (
          <pre>{JSON.stringify(soilData, null, 2)}</pre>
        ) : (
          <p>No soil data available</p>
        )}
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2>Polygon NDVI / Historical Data</h2>
        {polygonData ? (
          <pre>{JSON.stringify(polygonData, null, 2)}</pre>
        ) : (
          <p>No polygon data available</p>
        )}
      </section>
    </div>
  );
};

export default ResultPage;
