"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getCategories, getCourts, getPairs } from "@/lib/supabase-queries";

export default function TestDBPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [pairs, setPairs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testDatabase();
  }, []);

  const testDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🧪 Testing database connection...");

      // Test categories
      console.log("📊 Testing categories...");
      const categoriesData = await getCategories("");
      setCategories(categoriesData);
      console.log("✅ Categories loaded:", categoriesData.length);

      // Test courts
      console.log("🏟️ Testing courts...");
      const courtsData = await getCourts("");
      setCourts(courtsData);
      console.log("✅ Courts loaded:", courtsData.length);

      // Test pairs for first category
      if (categoriesData.length > 0) {
        console.log("👥 Testing pairs for category:", categoriesData[0].id);
        const pairsData = await getPairs(categoriesData[0].id);
        setPairs(pairsData);
        console.log("✅ Pairs loaded:", pairsData.length);
      }

      console.log("🎉 Database test completed successfully!");
    } catch (error) {
      console.error("❌ Database test failed:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">
            🧪 Testing Database Connection
          </h1>
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4">Testing database connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🧪 Database Test Results</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              📊 Categories ({categories.length})
            </h2>
            {categories.length === 0 ? (
              <p className="text-gray-500">No categories found</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="bg-gray-50 p-2 rounded">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-500">ID: {category.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Courts */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              🏟️ Courts ({courts.length})
            </h2>
            {courts.length === 0 ? (
              <p className="text-gray-500">No courts found</p>
            ) : (
              <div className="space-y-2">
                {courts.map((court) => (
                  <div key={court.id} className="bg-gray-50 p-2 rounded">
                    <p className="font-medium">{court.name}</p>
                    <p className="text-sm text-gray-500">ID: {court.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pairs */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              👥 Pairs ({pairs.length})
            </h2>
            {pairs.length === 0 ? (
              <p className="text-gray-500">No pairs found</p>
            ) : (
              <div className="space-y-2">
                {pairs.slice(0, 5).map((pair) => (
                  <div key={pair.id} className="bg-gray-50 p-2 rounded">
                    <p className="font-medium">
                      {pair.player1.name} / {pair.player2.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ranking: {pair.seed}
                    </p>
                  </div>
                ))}
                {pairs.length > 5 && (
                  <p className="text-sm text-gray-500">
                    ... and {pairs.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={testDatabase}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔄 Test Again
          </button>
        </div>
      </div>
    </div>
  );
}
