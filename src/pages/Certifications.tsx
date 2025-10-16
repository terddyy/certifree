import React, { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  BookOpen,
  Heart,
  ExternalLink,
  Grid3X3,
  List,
  SlidersHorizontal,
  Trash,
  Pencil,
  Plus
} from "lucide-react";
import { type Certification } from "@/lib/types/certifications";
import { Link, useNavigate } from "react-router-dom";
import { useCertifications } from "@/hooks/useCertifications";
import { supabase } from "@/lib/supabase";
import { componentDebug } from "@/lib/debugger";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { deleteCertification, listCategories, updateCertification as updateCertificationAdmin, createCertification as createCertificationAdmin, CertificationInput } from "@/lib/admin";
import { addFavorite, removeFavorite, isFavorited } from "@/lib/favorites";
import { isTaking, startTaking, stopTaking, countTakersFor } from "@/lib/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadCertificationAsset } from "@/lib/storage";

interface Category {
  name: string;
  count: number;
}

interface Provider {
  name: string;
  count: number;
}

const Certifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  // Remove difficulty filtering per request
  const [selectedDifficulty] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const debug = componentDebug('Certifications');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = !!(profile?.isAdmin || profile?.isSuperAdmin);
  const { toast } = useToast();

  const requireAuth = (action: () => void) => {
    if (!profile?.id) {
      toast({ title: "Please sign in", description: "Create an account to view details.", });
      navigate('/auth');
      return;
    }
    action();
  };

  // Debounce search input (ignore <2 chars)
  useEffect(() => {
    const t = setTimeout(() => {
      const q = (searchQuery || "").trim();
      setDebouncedSearch(q.length >= 2 ? q : "");
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { certifications: filteredCertifications, loading, error } = useCertifications(useMemo(() => ({
    searchQuery: debouncedSearch,
    selectedCategory,
    selectedDifficulty,
    selectedProvider,
    sortBy,
  }), [debouncedSearch, selectedCategory, selectedDifficulty, selectedProvider, sortBy]));

  const [certs, setCerts] = useState<Certification[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [takingIds, setTakingIds] = useState<Record<string, boolean>>({});
  const [takersCount, setTakersCount] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);

  const [editForm, setEditForm] = useState<Partial<CertificationInput>>({
    title: "",
    provider: "",
    category: "",
    difficulty: "Beginner",
    duration: "",
    description: "",
    externalUrl: "",
    certificationType: "Course",
    imageUrl: "",
  });

  const openEdit = (c: Certification) => {
    setEditing(c);
    setEditForm({
      title: c.title,
      provider: c.provider,
      category: c.category,
      difficulty: c.difficulty,
      duration: c.duration,
      description: c.description,
      externalUrl: c.external_url || "",
      certificationType: c.certification_type,
      imageUrl: c.image_url || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    const { error } = await updateCertificationAdmin(editing.id, {
      ...editForm,
      certificationType: editForm.certificationType as "Course" | "Exam" | "Project" | "Bootcamp" | "Public",
    });
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setCerts(prev => prev.map(c => c.id === editing.id ? { ...c, ...editForm } as Certification : c));
      toast({ title: "Certification updated" });
      setEditing(null);
    }
  };

  // Add Certification form
  const [addForm, setAddForm] = useState<Partial<CertificationInput>>({
    title: "",
    provider: "",
    category: "",
    difficulty: "Beginner",
    duration: "",
    description: "",
    externalUrl: "",
    certificationType: "Course",
    imageUrl: "",
  });

  const saveAdd = async () => {
    if (!addForm.title || !addForm.provider || !addForm.category) {
      toast({ title: "Missing fields", description: "Title, Provider, Category are required.", variant: "destructive" });
      return;
    }

    // Validate external URL
    if (!addForm.externalUrl || addForm.externalUrl.trim() === '' || addForm.externalUrl === '#') {
      toast({ 
        title: "Invalid URL", 
        description: "Please provide a valid external URL for the certification.", 
        variant: "destructive" 
      });
      return;
    }

    // Basic URL format validation
    try {
      new URL(addForm.externalUrl);
    } catch {
      toast({ 
        title: "Invalid URL format", 
        description: "Please provide a valid URL starting with http:// or https://", 
        variant: "destructive" 
      });
      return;
    }

    // Generate ID (slug) from title
    const generatedId = addForm.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
    if (!generatedId) {
        toast({ title: "Invalid Title", description: "Could not generate a valid ID from the title. Please provide a more descriptive title.", variant: "destructive" });
        return;
    }

    // Check for duplicate ID
    const { data: existingCert, error: duplicateCheckError } = await supabase
      .from('certifications')
      .select('id')
      .eq('id', generatedId)
      .maybeSingle(); // Use maybeSingle() to avoid 406 error when no match
    
    if (duplicateCheckError) {
      debug.error('Error checking for duplicate certification', { error: duplicateCheckError.message });
      toast({ 
        title: "Error", 
        description: "Could not verify if certification already exists. Please try again.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (existingCert) {
      toast({ 
        title: "Duplicate certification", 
        description: `A certification with ID "${generatedId}" already exists. Please use a more unique title.`, 
        variant: "destructive" 
      });
      return;
    }

    const newCertification: CertificationInput = {
      id: generatedId,
      title: addForm.title,
      provider: addForm.provider,
      category: addForm.category,
      difficulty: addForm.difficulty || "Beginner",
      duration: addForm.duration || "",
      description: addForm.description || "",
      externalUrl: addForm.externalUrl,
      imageUrl: addForm.imageUrl || "",
      isFree: true,
      certificationType: addForm.certificationType || 'Course',
      tags: addForm.tags || [],
    };
    
    const { error } = await createCertificationAdmin(newCertification);
    if (error) {
      debug.error('Failed to create certification', { error: error.message, input: newCertification });
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    } else {
      const newCert: Certification = {
        id: generatedId,
        title: addForm.title,
        provider: addForm.provider,
        category: addForm.category,
        difficulty: addForm.difficulty || "Beginner",
        duration: addForm.duration || "",
        rating: 0,
        total_reviews: 0,
        description: addForm.description || "",
        skills: addForm.skills || [],
        prerequisites: addForm.prerequisites || [],
        image_url: addForm.imageUrl || null,
        external_url: addForm.externalUrl || null,
        is_free: true,
        certification_type: newCertification.certificationType, // ✅ Use the same value sent to DB
        career_impact: 0,
        completion_count: 0,
        tags: addForm.tags || [],
        admin_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCerts(prev => [newCert, ...prev]);
      setAdding(false);
      setAddForm({ title: "", provider: "", category: "", difficulty: "Beginner", duration: "", description: "", externalUrl: "", certificationType: "Course", imageUrl: "" });
      toast({ title: "Certification created" });
    }
  };

  useEffect(() => {
    setCerts(filteredCertifications);
    debug.log('Filtered certifications received', { count: filteredCertifications.length, certifications: filteredCertifications });
    // Preload favorite states for visible certs
    (async () => {
      const entries = await Promise.all(filteredCertifications.map(async (c) => {
        if (!profile?.id) return [c.id, false] as const;
        const { data } = await isFavorited(profile.id, c.id);
        return [c.id, !!data] as const;
      }));
      const map: Record<string, boolean> = {};
      entries.forEach(([id, fav]) => (map[id] = fav));
      setFavoriteIds(map);
      // Preload taking states
      const takingEntries = await Promise.all(filteredCertifications.map(async (c) => {
        if (!profile?.id) return [c.id, false] as const;
        const { data } = await isTaking(profile.id, c.id);
        return [c.id, !!data] as const;
      }));
      const takingMap: Record<string, boolean> = {};
      takingEntries.forEach(([id, t]) => (takingMap[id] = t));
      setTakingIds(takingMap);
      // Load takers count
      const counts = await countTakersFor(filteredCertifications.map(c => c.id));
      setTakersCount(counts);
    })();
  }, [filteredCertifications, profile?.id]);

  useEffect(() => {
    const fetchCategories = async () => {
      debug.log('Fetching categories');
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const { data, error } = await listCategories();
        if (error) {
          debug.error('Error fetching categories', { error: error.message });
          setCategoriesError(error.message);
        } else {
          const formatted: Category[] = (data || []).map((c: any) => ({ name: c.name, count: 0 }));
          setCategories(formatted);
          debug.log('Categories fetched', { count: formatted.length });
        }
      } catch (err: any) {
        debug.error('Unhandled error fetching categories', { error: err.message, stack: err.stack });
        setCategoriesError(err.message);
      } finally {
        setCategoriesLoading(false);
      }
    };

    const fetchProviders = async () => {
      debug.log('Fetching providers');
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const { data, error } = await supabase
          .from('certifications')
          .select('provider');

        if (error) {
          debug.error('Error fetching providers', { error: error.message });
          setProvidersError(error.message);
        } else {
          // Extract unique providers and count occurrences
          const providerCounts: { [key: string]: number } = {};
          data.forEach(cert => {
            providerCounts[cert.provider] = (providerCounts[cert.provider] || 0) + 1;
          });
          const uniqueProviders: Provider[] = Object.keys(providerCounts).map(name => ({
            name,
            count: providerCounts[name],
          }));
          setProviders(uniqueProviders);
          debug.log('Providers fetched', { count: uniqueProviders.length });
        }
      } catch (err: any) {
        debug.error('Unhandled error fetching providers', { error: err.message, stack: err.stack });
        setProvidersError(err.message);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchCategories();
    fetchProviders();
  }, []);

  useEffect(() => {
    // Notify when new certifications are added (realtime)
    const channel = supabase
      .channel('certifications-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'certifications' }, (payload) => {
        const title = (payload.new as any)?.title || 'New certification';
        toast({ title: 'New certification added', description: title });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!isAdmin) return;
    if (!confirm(`Delete certification "${title}"?`)) return;
    try {
      setDeletingId(id);
      const { error } = await deleteCertification(id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      } else {
        setCerts(prev => prev.filter(c => c.id !== id));
        toast({ title: "Certification deleted" });
      }
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (cert: Certification) => {
    if (!profile?.id) return void toast({ title: "Please sign in to favorite." });
    const isFav = !!favoriteIds[cert.id];
    setFavoriteIds(prev => ({ ...prev, [cert.id]: !isFav }));
    const { error } = isFav ? await removeFavorite(profile.id, cert.id) : await addFavorite(profile.id, cert.id);
    if (error) {
      // revert on error
      setFavoriteIds(prev => ({ ...prev, [cert.id]: isFav }));
      toast({ title: "Could not update favorites", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleTaking = async (cert: Certification) => {
    if (!profile?.id) return void toast({ title: "Please sign in to track progress." });
    const taking = !!takingIds[cert.id];
    setTakingIds(prev => ({ ...prev, [cert.id]: !taking }));
    // optimistic update of count
    setTakersCount(prev => ({ ...prev, [cert.id]: Math.max(0, (prev[cert.id] || 0) + (taking ? -1 : 1)) }));
    const { error } = taking ? await stopTaking(profile.id, cert.id) : await startTaking(profile.id, cert.id);
    if (error) {
      setTakingIds(prev => ({ ...prev, [cert.id]: taking }));
      setTakersCount(prev => ({ ...prev, [cert.id]: Math.max(0, (prev[cert.id] || 0) + (taking ? 1 : -1)) }));
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000814] text-gray-300">
        <p>Loading certifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000814] text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  const MAX_UPLOAD_MB = 1;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "application/pdf"];

  // const CategoryPills = () => (
  //   <div className="flex flex-wrap gap-2">
  //     <Button
  //       variant={selectedCategory === "all" ? "default" : "outline"}
  //       className={selectedCategory === "all" ? "bg-[#ffc300] text-[#001d3d]" : "text-gray-300 border-[#003566]"}
  //       onClick={() => setSelectedCategory("all")}
  //     >
  //       All
  //     </Button>
  //     {categories.map(cat => (
  //       <Button
  //         key={cat.name}
  //         variant={selectedCategory === cat.name ? "default" : "outline"}
  //         className={selectedCategory === cat.name ? "bg-[#ffc300] text-[#001d3d]" : "text-gray-300 border-[#003566]"}
  //         onClick={() => setSelectedCategory(cat.name)}
  //       >
  //         {cat.name}
  //       </Button>
  //     ))}
  //     {isAdmin && (
  //       <Button variant="ghost" className="text-gray-300 hover:text-[#ffd60a]" onClick={() => navigate('/settings')}>Manage</Button>
  //     )}
  //   </div>
  // );

  const CertificationCard = ({ certification, isAdmin, openEdit, handleDelete, deletingId, favoriteIds, handleToggleFavorite, takersCount, requireAuth }: {
    certification: Certification;
    isAdmin: boolean;
    openEdit: (cert: Certification) => void;
    handleDelete: (id: string, title: string) => Promise<void>;
    deletingId: string | null;
    favoriteIds: Record<string, boolean>;
    handleToggleFavorite: (cert: Certification) => Promise<void>;
    takersCount: Record<string, number>;
    requireAuth: (action: () => void) => void;
  }) => (
    <Card className="relative bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#001d3d] text-white rounded-xl shadow-lg border border-[#ffd60a]/20 hover:shadow-[0_0_30px_rgba(255,214,10,0.3)] hover:scale-[1.02] transition-all duration-300 ease-out group backdrop-blur-sm overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffd60a]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start justify-between mb-3">
          {/* Admin controls and favorite */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-gray-200 border-[#3b82f6]/50 hover:bg-[#003566] hover:border-[#3b82f6] transition-all"
                  onClick={() => openEdit(certification)}
                  title="Edit certification"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="hover:bg-red-700 hover:shadow-lg transition-all"
                  onClick={() => handleDelete(certification.id, certification.title)}
                  disabled={deletingId === certification.id}
                  title="Delete certification"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              className={`hover:bg-[#003566]/50 px-2 transition-all ${favoriteIds[certification.id] ? 'text-red-500' : 'text-gray-300'}`} 
              onClick={() => handleToggleFavorite(certification)} 
              aria-label="Toggle favorite"
            >
              <Heart className={`h-4 w-4 mr-1 transition-all ${favoriteIds[certification.id] ? 'fill-red-500 scale-110' : ''}`} />
              <span className="text-xs font-medium">{favoriteIds[certification.id] ? 'Saved' : 'Save'}</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-20 h-14 rounded-lg shadow-md overflow-hidden bg-gradient-to-br from-[#003566] to-[#001d3d] flex items-center justify-center flex-shrink-0 border border-[#ffd60a]/10">
              {certification.image_url ? (
                <img src={certification.image_url} alt={certification.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <BookOpen className="h-6 w-6 text-[#ffd60a]/50" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-tight text-white group-hover:text-[#ffd60a] transition-colors font-bold">
                <button onClick={() => requireAuth(() => {
                  navigate(`/certifications/${certification.id}`);
                })} className="text-left w-full hover:underline">
                  {certification.title}
                </button>
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-[#003566]/50 text-[#ffd60a] border-[#ffd60a]/30 font-semibold">
                  {certification.provider}
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{certification.description}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        <div className="flex items-center gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#ffd60a]" />
            <span className="font-medium">{certification.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#ffd60a]" />
            <span className="font-medium">{(takersCount[certification.id] || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-[#ffd60a]" />
            <span className="font-medium">{certification.rating || 'N/A'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(certification.skills || []).slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-[10px] bg-[#001d3d]/50 text-gray-200 border-[#ffd60a]/20 font-medium hover:border-[#ffd60a]/50 transition-colors">
              {skill}
            </Badge>
          ))}
          {(certification.skills || []).length > 3 && (
            <Badge variant="outline" className="text-[10px] bg-[#001d3d]/50 text-[#ffd60a] border-[#ffd60a]/30 font-medium">
              +{(certification.skills || []).length - 3}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            className="flex-1 bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#001d3d] font-bold hover:shadow-lg hover:shadow-[#ffd60a]/30 transition-all duration-200" 
            onClick={() => requireAuth(() => {
              navigate(`/certifications/${certification.id}`);
            })}
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Details
          </Button>
          <Button variant="outline" size="icon" asChild className="bg-[#003566]/50 text-[#ffd60a] border-[#ffd60a]/30 hover:bg-[#003566] hover:border-[#ffd60a] transition-all">
            <a href={profile?.id ? certification.external_url : '/auth'} target={profile?.id ? "_blank" : "_self"} rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const CertificationListItem = ({ certification, isAdmin, openEdit, handleDelete, deletingId, favoriteIds, handleToggleFavorite, takersCount, requireAuth }: {
    certification: Certification;
    isAdmin: boolean;
    openEdit: (cert: Certification) => void;
    handleDelete: (id: string, title: string) => Promise<void>;
    deletingId: string | null;
    favoriteIds: Record<string, boolean>;
    handleToggleFavorite: (cert: Certification) => Promise<void>;
    takersCount: Record<string, number>;
    requireAuth: (action: () => void) => void;
  }) => (
    <Card className="relative bg-gradient-to-r from-[#001d3d] via-[#003566] to-[#001d3d] text-white rounded-xl shadow-lg border border-[#ffd60a]/20 hover:shadow-[0_0_30px_rgba(255,214,10,0.3)] hover:scale-[1.01] transition-all duration-300 ease-out group backdrop-blur-sm overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#ffd60a]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Image */}
          <div className="w-full sm:w-32 flex-shrink-0">
            <div className="aspect-video sm:aspect-square rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-[#003566] to-[#001d3d] flex items-center justify-center text-sm text-gray-200 border border-[#ffd60a]/10">
              {certification.image_url ? (
                <img src={certification.image_url} alt={certification.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-8 w-8 text-[#ffd60a]/50" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#ffd60a] transition-colors duration-200">
                    <button onClick={() => requireAuth(() => {
                      navigate(`/certifications/${certification.id}`);
                    })} className="text-left hover:underline">
                      {certification.title}
                    </button>
                  </h3>
                  <Badge variant="outline" className="text-xs bg-[#003566]/50 text-[#ffd60a] border-[#ffd60a]/30 font-semibold flex-shrink-0">
                    {certification.provider}
                  </Badge>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{certification.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-gray-200 border-[#3b82f6]/50 hover:bg-[#003566] hover:border-[#3b82f6] transition-all"
                      onClick={() => openEdit(certification)}
                      title="Edit certification"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="hover:bg-red-700 hover:shadow-lg transition-all"
                      onClick={() => handleDelete(certification.id, certification.title)}
                      disabled={deletingId === certification.id}
                      title="Delete certification"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  className={`hover:bg-[#003566]/50 px-2 transition-all ${favoriteIds[certification.id] ? 'text-red-500' : 'text-gray-300'}`} 
                  onClick={() => handleToggleFavorite(certification)}
                >
                  <Heart className={`h-4 w-4 mr-1 transition-all ${favoriteIds[certification.id] ? 'fill-red-500 scale-110' : ''}`} />
                  <span className="text-xs font-medium">{favoriteIds[certification.id] ? 'Saved' : 'Save'}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#ffd60a]" />
                  <span className="font-medium">{certification.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#ffd60a]" />
                  <span className="font-medium">{(takersCount[certification.id] || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-[#ffd60a]" />
                  <span className="font-medium">{certification.rating || 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <Button 
                  className="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#001d3d] font-bold hover:shadow-lg hover:shadow-[#ffd60a]/30 transition-all duration-200" 
                  onClick={() => requireAuth(() => {
                    navigate(`/certifications/${certification.id}`);
                  })}
                >
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  View Details
                </Button>
                <Button variant="outline" size="icon" asChild className="bg-[#003566]/50 text-[#ffd60a] border-[#ffd60a]/30 hover:bg-[#003566] hover:border-[#ffd60a] transition-all">
                  <a href={profile?.id ? certification.external_url : '/auth'} target={profile?.id ? "_blank" : "_self"} rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Separate CertiFree and Public Certifications
  const certiFreeCerts = certs.filter(cert => false);
  const publicCerts = certs.filter(cert => true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#000814] text-gray-100">
      <Header />

      <main className="container mx-auto px-6 py-12 md:py-16">
        {/* Page Header */}
        <div className="mb-12 text-center relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ffd60a]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#003566]/20 rounded-full blur-3xl"></div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Discover Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffc300] to-[#ffd60a]">Free Certification</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Explore a vast library of high-quality IT and business certifications, meticulously curated to help you elevate your skills and career.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffd60a]/20 to-[#ffc300]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ffd60a]" />
              <Input
                placeholder="Search certifications, providers, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 h-12 bg-gradient-to-r from-[#001d3d] to-[#003566] border-[#ffd60a]/30 text-white placeholder-gray-400 focus:border-[#ffd60a] focus:ring-[#ffd60a] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Categories Row */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#ffd60a]" />
              Categories
            </h3>
            {isAdmin && (
              <Button size="sm" className="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#001d3d] font-bold hover:shadow-lg hover:shadow-[#ffd60a]/30 transition-all" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Certification
              </Button>
            )}
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[220px] bg-gradient-to-r from-[#001d3d] to-[#003566] border-[#ffd60a]/30 text-white hover:border-[#ffd60a] transition-all">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-[#001d3d] border-[#ffd60a]/30 text-white">
              <SelectItem value="all" className="hover:bg-[#003566] hover:text-[#ffd60a] focus:bg-[#003566] focus:text-[#ffd60a]">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name} className="hover:bg-[#003566] hover:text-[#ffd60a] focus:bg-[#003566] focus:text-[#ffd60a]">
                  {cat.name}
                </SelectItem>
              ))}
              {isAdmin && (
                <Button variant="ghost" className="text-gray-300 hover:text-[#ffd60a] w-full text-left justify-start mt-2" onClick={() => navigate('/settings')}>Manage Categories</Button>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* CertiFree Certifications Section */}
        {certiFreeCerts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-gradient-to-b from-[#ffc300] to-[#ffd60a] rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">CertiFree Certifications</h2>
            </div>
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {certiFreeCerts.map((certification) => (
                viewMode === "grid" ? (
                  <CertificationCard
                    key={certification.id}
                    certification={certification}
                    isAdmin={isAdmin}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                    favoriteIds={favoriteIds}
                    handleToggleFavorite={handleToggleFavorite}
                    takersCount={takersCount}
                    requireAuth={requireAuth}
                  />
                ) : (
                  <CertificationListItem
                    key={certification.id}
                    certification={certification}
                    isAdmin={isAdmin}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                    favoriteIds={favoriteIds}
                    handleToggleFavorite={handleToggleFavorite}
                    takersCount={takersCount}
                    requireAuth={requireAuth}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* Public Certifications Section */}
        {publicCerts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-gradient-to-b from-[#ffc300] to-[#ffd60a] rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">
                {certiFreeCerts.length > 0 ? 'Public Certifications' : 'All Certifications'}
              </h2>
            </div>
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {publicCerts.map((certification) => (
                viewMode === "grid" ? (
                  <CertificationCard
                    key={certification.id}
                    certification={certification}
                    isAdmin={isAdmin}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                    favoriteIds={favoriteIds}
                    handleToggleFavorite={handleToggleFavorite}
                    takersCount={takersCount}
                    requireAuth={requireAuth}
                  />
                ) : (
                  <CertificationListItem
                    key={certification.id}
                    certification={certification}
                    isAdmin={isAdmin}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                    favoriteIds={favoriteIds}
                    handleToggleFavorite={handleToggleFavorite}
                    takersCount={takersCount}
                    requireAuth={requireAuth}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {certs.length === 0 && (
          <div className="relative text-center py-20 bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#001d3d] rounded-2xl border border-[#ffd60a]/20 shadow-xl text-gray-300 overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffd60a]/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#003566]/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#003566] to-[#001d3d] border border-[#ffd60a]/30 mb-6">
                <BookOpen className="h-10 w-10 text-[#ffd60a]" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">No certifications found</h3>
              <p className="text-base text-gray-300 max-w-md mx-auto">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
            </div>
          </div>
        )}

        {/* Results Header (moved to reflect combined count) */}
        <div className="flex items-center justify-between mb-6 text-gray-300">
          <p className="text-lg font-medium">
            Showing <span className="text-[#ffd60a] font-bold">{certs.length}</span> certifications 
            {debouncedSearch && <span className="text-gray-400"> for "{debouncedSearch}"</span>}
          </p>
          <div className="flex rounded-lg border border-[#ffd60a]/30 bg-gradient-to-r from-[#001d3d] to-[#003566] overflow-hidden shadow-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`rounded-none ${
                viewMode === "grid" ? "bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#001d3d] hover:shadow-lg" : "text-gray-300 hover:bg-[#003566]/50 hover:text-[#ffd60a]"
              }`}
              title="Grid view"
            >
              <Grid3X3 className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`rounded-none ${
                viewMode === "list" ? "bg-gradient-to-r from-[#ffc300] to-[#ffd60a] text-[#001d3d] hover:shadow-lg" : "text-gray-300 hover:bg-[#003566]/50 hover:text-[#ffd60a]"
              }`}
              title="List view"
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        
      </main>

      <Footer />

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="bg-[#001d3d] border-[#003566] text-gray-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Certification</DialogTitle>
            <DialogDescription>Update the certification details and save your changes.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Provider</Label>
              <Input value={editForm.provider} onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger className="bg-[#000814] border-[#003566] text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-[#001d3d] border-[#003566] text-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="hover:bg-[#003566] hover:text-[#ffd60a]">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Difficulty removed from UI per request */}
            <div>
              <Label className="text-gray-300">Duration</Label>
              <Input value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">External URL</Label>
              <Input value={editForm.externalUrl} onChange={(e) => setEditForm({ ...editForm, externalUrl: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">Image (URL or Upload)</Label>
              <Input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://example.com/image.png" className="mb-2 bg-[#000814] border-[#003566] text-white" />
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="text-sm" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !editing) return;
                if (!ALLOWED_TYPES.includes(f.type)) {
                  toast({ title: 'Invalid file type', description: 'Allowed: JPG, PNG, PDF', variant: 'destructive' });
                  return;
                }
                if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
                  toast({ title: 'File too large', description: `Max ${MAX_UPLOAD_MB}MB`, variant: 'destructive' });
                  return;
                }
                const { url, error } = await uploadCertificationAsset(f, editing.id);
                if (error) toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                else setEditForm((prev) => ({ ...prev, imageUrl: url || prev.imageUrl }));
              }} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="border-[#003566] text-white hover:bg-[#003566]" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="bg-[#ffc300] text-[#001d3d] font-bold hover:bg-[#ffd60a]" onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="bg-[#001d3d] border-[#003566] text-gray-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Certification</DialogTitle>
            <DialogDescription>Provide the details below to create a new certification.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Removed ID (slug) field - now auto-generated from Title */}
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Provider</Label>
              <Input value={addForm.provider} onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Category</Label>
              <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                <SelectTrigger className="bg-[#000814] border-[#003566] text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-[#001d3d] border-[#003566] text-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="hover:bg-[#003566] hover:text-[#ffd60a]">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Difficulty removed from UI per request */}
            <div>
              <Label className="text-gray-300">Duration</Label>
              <Input value={addForm.duration} onChange={(e) => setAddForm({ ...addForm, duration: e.target.value })} className="bg-[#000814] border-[#003566] text-white" placeholder="e.g., 20-30 hours" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">External URL</Label>
              <Input value={addForm.externalUrl} onChange={(e) => setAddForm({ ...addForm, externalUrl: e.target.value })} className="bg-[#000814] border-[#003566] text-white" placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">Image (URL or Upload)</Label>
              <Input value={addForm.imageUrl} onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })} className="mb-2 bg-[#000814] border-[#003566] text-white" placeholder="https://example.com/image.png" />
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="text-sm" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!addForm.title) { 
                  toast({ title: 'Provide a title first', description: 'We need a title to generate the ID for file storage.', variant: 'destructive' }); 
                  return; 
                }
                if (!ALLOWED_TYPES.includes(f.type)) {
                  toast({ title: 'Invalid file type', description: 'Allowed: JPG, PNG, PDF', variant: 'destructive' });
                  return;
                }
                if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
                  toast({ title: 'File too large', description: `Max ${MAX_UPLOAD_MB}MB`, variant: 'destructive' });
                  return;
                }
                // Generate ID from title for file upload
                const generatedId = addForm.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
                if (!generatedId) {
                  toast({ title: 'Invalid title', description: 'Could not generate a valid ID from the title.', variant: 'destructive' });
                  return;
                }
                const { url, error } = await uploadCertificationAsset(f, generatedId);
                if (error) toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                else setAddForm((prev) => ({ ...prev, imageUrl: url || prev.imageUrl }));
              }} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} className="bg-[#000814] border-[#003566] text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="border-[#003566] text-white hover:bg-[#003566]" onClick={() => setAdding(false)}>Cancel</Button>
            <Button className="bg-[#ffc300] text-[#001d3d] font-bold hover:bg-[#ffd60a]" onClick={saveAdd}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Certifications;