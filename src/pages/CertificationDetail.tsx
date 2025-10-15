import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronRight, ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ReviewCard } from "@/components/ReviewCard"; // This import path remains as before
import { useAuth } from "@/hooks/useAuth";
import {
  isTaking,
  startTaking,
  stopTaking,
  UserProgressRow,
} from "@/lib/progress";
import {
  getCertification,
  checkFavoriteStatus,
  addFavorite,
  removeFavorite,
} from "@/lib/certifications-api";
import { Certification } from "@/lib/types/certifications";

export default function CertificationDetail() { // Changed function name to match file
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [certification, setCertification] = useState<Certification | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTakingStatus, setUserTakingStatus] = useState<boolean | null>(
    null
  );
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(5); // Default rating
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchCertification = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await getCertification(id); // Corrected function call

        if (error) {
          throw error;
        }

        if (data) {
          setCertification(data as Certification); // Cast directly to Certification
        } else {
          setError("Certification not found");
        }
      } catch (err: any) {
        console.error("Error fetching certification:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCertification();
  }, [id]);

  useEffect(() => {
    const checkUserTakingStatus = async () => {
      if (user && certification) {
        const { data, error } = await isTaking(user.id, certification.id);
        if (error) {
          console.error("Error checking user taking status:", error.message);
          setUserTakingStatus(false);
        } else {
          setUserTakingStatus(data);
        }
      }
    };
    checkUserTakingStatus();
  }, [user, certification]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user && certification) {
        const { data, error } = await checkFavoriteStatus(user.id, certification.id);
        if (error) {
          console.error("Error checking favorite status:", error.message);
          setIsFavorite(false);
        } else {
          setIsFavorite(data);
        }
      }
    };
    checkFavorite();
  }, [user, certification]);

  const handleToggleFavorite = async () => {
    if (!user || !certification) {
      toast.error("Please log in to manage favorites.");
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        const { error } = await removeFavorite(user.id, certification.id);
        if (error) throw error;
        setIsFavorite(false);
        toast.success(`"${certification.title}" removed from favorites.`);
      } else {
        const { error } = await addFavorite(user.id, certification.id);
        if (error) throw error;
        setIsFavorite(true);
        toast.success(`"${certification.title}" added to favorites!`);
      }
    } catch (err: any) {
      console.error("Error toggling favorite status:", err.message);
      toast.error(`Failed to update favorite status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaking = async () => {
    if (!user || !certification) {
      toast.error("Please log in to track your progress.");
      return;
    }

    setLoading(true);
    try {
      if (userTakingStatus) {
        // Currently taking, so stop
        const { error } = await stopTaking(user.id, certification.id);
        if (error) throw error;
        setUserTakingStatus(false);
        toast.success(
          `You are no longer taking "${certification.title}".`
        );
      } else {
        // Not taking, so start
        const { error } = await startTaking(user.id, certification.id);
        if (error) throw error;
        setUserTakingStatus(true);
        toast.success(`You are now taking "${certification.title}"!`);
      }
    } catch (err: any) {
      console.error("Error toggling taking status:", err.message);
      toast.error(`Failed to update progress: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !certification) {
      toast.error("Please log in to submit a review.");
      return;
    }
    if (!reviewContent.trim()) {
      toast.error("Review content cannot be empty.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { data, error } = await supabase.from("reviews").insert({
        user_id: user.id,
        certification_id: certification.id,
        rating: reviewRating,
        content: reviewContent.trim(),
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      setReviewContent("");
      // Optionally, re-fetch reviews or update UI
    } catch (err: any) {
      console.error("Error submitting review:", err.message);
      toast.error(`Failed to submit review: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading certification...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">Error: {error}</div>
    );
  }

  if (!certification) {
    return (
      <div className="container mx-auto p-4">Certification not found.</div>
    );
  }

  const breadcrumbs = [
    { name: "Certifications", href: "/certifications" },
    { name: certification.title, href: `/certifications/${certification.id}` },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <nav>
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.name} className="flex items-center">
                  <Link
                    to={crumb.href}
                    className="hover:text-[#003566] transition-colors flex items-center font-medium"
                  >
                    {crumb.name}
                  </Link>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-4 h-4 ml-2 text-gray-400" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#000814] via-[#001d3d] to-[#003566] text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left: Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Provider & Category */}
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                  {certification.provider}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-300">{certification.category}</span>
              </div>

              {/* Title */}
              <h1 className="text-5xl font-bold leading-tight tracking-tight">
                {certification.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-300 leading-relaxed max-w-3xl">
                {certification.description}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${
                          i < Math.floor(certification.rating)
                            ? "text-[#ffd60a]"
                            : "text-gray-500"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-lg font-semibold">
                    {certification.rating}
                  </span>
                  <span className="text-gray-400">
                    ({certification.total_reviews} reviews)
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-600"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">{certification.duration}</span>
                </div>
                <div className="h-6 w-px bg-gray-600"></div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    certification.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-300' :
                    certification.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {certification.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Image & Actions */}
            <div className="lg:col-span-1 space-y-4">
              {certification.image_url && (
                <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <img
                    src={certification.image_url}
                    alt={certification.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full bg-[#ffd60a] hover:bg-[#ffc800] text-[#000814] py-6 px-6 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  asChild
                >
                  <a href={certification.external_url} target="_blank" rel="noopener noreferrer">
                    Start Certification
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className={`py-6 px-4 rounded-xl text-base font-medium border-2 transition-all duration-200 ${
                      userTakingStatus
                        ? "bg-white/10 border-white/30 text-white hover:bg-white/20"
                        : "bg-transparent border-white/30 text-white hover:bg-white/10"
                    }`}
                    onClick={handleToggleTaking}
                    disabled={loading}
                  >
                    {userTakingStatus ? "Taking ✓" : "Track Progress"}
                  </Button>

                  <Button
                    variant="outline"
                    className={`py-6 px-4 rounded-xl text-base font-medium border-2 transition-all duration-200 ${
                      isFavorite
                        ? "bg-[#ffd60a]/20 border-[#ffd60a] text-[#ffd60a] hover:bg-[#ffd60a]/30"
                        : "bg-transparent border-white/30 text-white hover:bg-white/10"
                    }`}
                    onClick={handleToggleFavorite}
                    disabled={loading}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Free/Paid Badge */}
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 rounded-xl backdrop-blur-sm">
                <span className="text-sm font-medium">
                  {certification.is_free ? "🎉 Free Certification" : "💼 Paid Certification"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Quick Info */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Info
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#003566] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Provider</p>
                    <p className="text-base font-medium text-gray-900">
                      {certification.provider}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#003566] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-base font-medium text-gray-900">
                      {certification.duration}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#003566] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-base font-medium text-gray-900">
                      {certification.certification_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#003566] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Career Impact</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#ffd60a] h-2 rounded-full"
                          style={{ width: `${(certification.career_impact / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-base font-medium text-gray-900">
                        {certification.career_impact}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-[#003566] data-[state=active]:text-white rounded-lg px-6 py-3 font-medium transition-all"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="skills"
                  className="data-[state=active]:bg-[#003566] data-[state=active]:text-white rounded-lg px-6 py-3 font-medium transition-all"
                >
                  Skills
                </TabsTrigger>
                <TabsTrigger 
                  value="prerequisites"
                  className="data-[state=active]:bg-[#003566] data-[state=active]:text-white rounded-lg px-6 py-3 font-medium transition-all"
                >
                  Prerequisites
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews"
                  className="data-[state=active]:bg-[#003566] data-[state=active]:text-white rounded-lg px-6 py-3 font-medium transition-all"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      About This Certification
                    </h2>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {certification.description}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      What You'll Learn
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certification.skills && certification.skills.length > 0 ? (
                        certification.skills.slice(0, 6).map((skill, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-[#003566]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[#003566] text-sm">✓</span>
                            </div>
                            <p className="text-base text-gray-700">{skill}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 col-span-2">
                          Skills details available on the certification provider's page.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Skills You'll Gain
                  </h2>
                  {certification.skills && certification.skills.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {certification.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#003566] transition-colors"
                        >
                          <div className="w-8 h-8 bg-[#003566] text-white rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <p className="text-base text-gray-900 font-medium">{skill}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        No specific skills listed. Visit the certification page for more details.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="prerequisites" className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Prerequisites
                  </h2>
                  {certification.prerequisites &&
                  certification.prerequisites.length > 0 ? (
                    <div className="space-y-3">
                      {certification.prerequisites.map((prereq, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
                        >
                          <div className="w-6 h-6 bg-[#ffd60a] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[#000814] text-xs font-bold">!</span>
                          </div>
                          <p className="text-base text-gray-900">{prereq}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-green-700 font-medium text-lg">
                        ✓ No prerequisites required - Perfect for beginners!
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-8 space-y-6">
                {/* Write Review Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Share Your Experience
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Rating
                      </label>
                      <div className="flex items-center gap-4">
                        <Slider
                          defaultValue={[reviewRating]}
                          max={5}
                          step={1}
                          min={1}
                          onValueChange={(val) => setReviewRating(val[0])}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-2xl ${
                                i < reviewRating
                                  ? "text-[#ffd60a]"
                                  : "text-gray-300"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review
                      </label>
                      <Textarea
                        placeholder="Share your thoughts about this certification. How was your experience? What did you learn?"
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        rows={5}
                        className="resize-none rounded-xl"
                      />
                    </div>
                    <Button 
                      onClick={handleSubmitReview} 
                      disabled={isSubmittingReview}
                      className="bg-[#003566] hover:bg-[#001d3d] text-white px-8 py-6 rounded-xl text-base font-semibold"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Student Reviews
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {certification.total_reviews} reviews
                  </p>
                  <div className="space-y-4">
                    <ReviewCard
                      userName="Alice Johnson"
                      rating={5}
                      date="2023-10-26"
                      content="Absolutely fantastic certification! Very comprehensive and well-structured. Highly recommend it for anyone looking to break into the field."
                    />
                    <ReviewCard
                      userName="Bob Smith"
                      rating={4}
                      date="2023-09-15"
                      content="Good content, but some parts were a bit challenging. The instructor was very knowledgeable and the material was up-to-date."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}