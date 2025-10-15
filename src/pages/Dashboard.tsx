import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Heart, Award, TrendingUp, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Certification } from "@/lib/types/certifications";

interface UserProgress {
  id: string;
  certification_id: string;
  progress: number;
  started_at: string;
  certifications?: Certification;
}

interface UserFavorite {
  certification_id: string;
  created_at: string;
  certifications?: Certification;
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*, certifications(*)')
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(5);

      if (progressError) throw progressError;
      setUserProgress(progressData || []);

      // Fetch favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('*, certifications(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (favoritesError) throw favoritesError;
      setFavorites(favoritesData || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error.message);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000814]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000814] via-[#001d3d] to-[#000814] text-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {profile?.fullName || user.email}!
          </h1>
          <p className="text-gray-400">
            Continue your certification journey
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#003566] border-[#ffd60a]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">In Progress</CardTitle>
              <BookOpen className="h-4 w-4 text-[#ffd60a]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{userProgress.length}</div>
              <p className="text-xs text-gray-400">Active certifications</p>
            </CardContent>
          </Card>

          <Card className="bg-[#003566] border-[#ffd60a]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-[#ffd60a]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{favorites.length}</div>
              <p className="text-xs text-gray-400">Saved for later</p>
            </CardContent>
          </Card>

          <Card className="bg-[#003566] border-[#ffd60a]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Completed</CardTitle>
              <Award className="h-4 w-4 text-[#ffd60a]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {profile?.totalCertificationsCompleted || 0}
              </div>
              <p className="text-xs text-gray-400">Certifications earned</p>
            </CardContent>
          </Card>

          <Card className="bg-[#003566] border-[#ffd60a]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#ffd60a]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {profile?.learningStreak || 0}
              </div>
              <p className="text-xs text-gray-400">Day streak</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* In Progress Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Continue Learning</h2>
              <Link to="/certifications">
                <Button variant="outline" size="sm" className="border-[#ffd60a] text-[#ffd60a] hover:bg-[#ffd60a] hover:text-[#000814]">
                  Browse All
                </Button>
              </Link>
            </div>

            {dataLoading ? (
              <Card className="bg-[#001d3d] border-[#ffd60a]/20">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">Loading...</p>
                </CardContent>
              </Card>
            ) : userProgress.length > 0 ? (
              <div className="space-y-4">
                {userProgress.map((item) => (
                  <Card key={item.id} className="bg-[#001d3d] border-[#ffd60a]/20 hover:border-[#ffd60a] transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-white">
                            {item.certifications?.title}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {item.certifications?.provider} • {item.certifications?.difficulty}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-[#003566] text-white">
                          {item.certifications?.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="font-medium text-[#ffd60a]">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2 bg-[#003566]" />
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/certifications/${item.certification_id}`} className="flex-1">
                          <Button className="w-full bg-[#ffd60a] text-[#000814] hover:bg-[#ffd60a]/90">
                            Continue
                          </Button>
                        </Link>
                        {item.certifications?.external_url && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-[#ffd60a]/50 text-[#ffd60a]"
                            onClick={() => window.open(item.certifications?.external_url || '', '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-[#001d3d] border-[#ffd60a]/20">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-[#ffd60a]" />
                  <h3 className="text-lg font-semibold text-white mb-2">No certifications in progress</h3>
                  <p className="text-gray-400 mb-4">Start your learning journey today!</p>
                  <Link to="/certifications">
                    <Button className="bg-[#ffd60a] text-[#000814] hover:bg-[#ffd60a]/90">
                      Browse Certifications
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Favorites Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Your Favorites</h2>
              <Link to="/favorites">
                <Button variant="outline" size="sm" className="border-[#ffd60a] text-[#ffd60a] hover:bg-[#ffd60a] hover:text-[#000814]">
                  View All
                </Button>
              </Link>
            </div>

            {dataLoading ? (
              <Card className="bg-[#001d3d] border-[#ffd60a]/20">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">Loading...</p>
                </CardContent>
              </Card>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {favorites.map((item) => (
                  <Card key={item.certification_id} className="bg-[#001d3d] border-[#ffd60a]/20 hover:border-[#ffd60a] transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base text-white">
                        {item.certifications?.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {item.certifications?.provider} • {item.certifications?.difficulty}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Link to={`/certifications/${item.certification_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full border-[#ffd60a] text-[#ffd60a]">
                            View Details
                          </Button>
                        </Link>
                        {item.certifications?.external_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#ffd60a]/50 text-[#ffd60a]"
                            onClick={() => window.open(item.certifications?.external_url || '', '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-[#001d3d] border-[#ffd60a]/20">
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-[#ffd60a]" />
                  <h3 className="text-lg font-semibold text-white mb-2">No favorites yet</h3>
                  <p className="text-gray-400 mb-4">
                    Save certifications you're interested in
                  </p>
                  <Link to="/certifications">
                    <Button className="bg-[#ffd60a] text-[#000814] hover:bg-[#ffd60a]/90">
                      Browse Certifications
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
