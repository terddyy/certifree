import { supabase } from "@/lib/supabase";

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export interface CertificationInput {
  id?: string; // Slug-based identifier (optional for create, will be auto-generated if not provided)
  title: string;
  provider: string;
  category: string; // category name or slug
  difficulty: string;
  duration: string;
  description: string;
  imageUrl?: string;
  externalUrl: string;
  isFree: boolean;
  certificationType: string;
  skills?: string[];
  prerequisites?: string[];
  rating?: number;
  totalReviews?: number;
  tags?: string[];
  type?: "public" | "certifree"; // Future feature: Not yet in database schema
  courseId?: string | null; // Future feature: Not yet in database schema
  completion_count?: number; // Added to match database schema
}

// New Interfaces for Courses and Lessons
export interface CourseInput {
  title: string;
  description?: string;
  imageUrl?: string;
  status?: 'draft' | 'published';
}

export interface LessonInput {
  courseId: string;
  title: string;
  content?: string;
  videoUrl?: string;
  order: number;
}

// Categories CRUD
export async function listCategories() {
  return supabase.from("categories").select("*").order("name");
}

export async function createCategory(input: CategoryInput) {
  return supabase.from("categories").insert({
    name: input.name,
    slug: input.slug,
    description: input.description || null,
  });
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>) {
  return supabase.from("categories").update(patch).eq("id", id);
}

export async function deleteCategory(id: string) {
  return supabase.from("categories").delete().eq("id", id);
}

// Certifications CRUD
export async function listCertifications(search?: string) {
  let query = supabase.from("certifications").select("*").order("title");
  if (search && search.trim()) {
    query = query.ilike("title", `%${search}%`);
  }
  return query;
}

export async function createCertification(input: CertificationInput) {
  return supabase.from("certifications").insert({
    id: input.id, // Use provided slug-based ID
    title: input.title,
    provider: input.provider,
    category: input.category,
    difficulty: input.difficulty,
    duration: input.duration,
    rating: input.rating ?? 0,
    total_reviews: input.totalReviews ?? 0,
    description: input.description,
    skills: input.skills ?? [],
    prerequisites: input.prerequisites ?? [],
    image_url: input.imageUrl ?? null,
    external_url: input.externalUrl,
    is_free: input.isFree,
    certification_type: input.certificationType,
    career_impact: 0,
    completion_count: 0,
    tags: input.tags ?? [],
    // Note: 'type' and 'course_id' columns don't exist in the current schema
    // If needed in the future, run migration to add these columns
  });
}

export async function updateCertification(id: string, patch: Partial<CertificationInput>) {
  const mapped: any = {};
  if (patch.title !== undefined) mapped.title = patch.title;
  if (patch.provider !== undefined) mapped.provider = patch.provider;
  if (patch.category !== undefined) mapped.category = patch.category;
  if (patch.difficulty !== undefined) mapped.difficulty = patch.difficulty;
  if (patch.duration !== undefined) mapped.duration = patch.duration;
  if (patch.description !== undefined) mapped.description = patch.description;
  if (patch.skills !== undefined) mapped.skills = patch.skills;
  if (patch.prerequisites !== undefined) mapped.prerequisites = patch.prerequisites;
  if (patch.rating !== undefined) mapped.rating = patch.rating;
  if (patch.totalReviews !== undefined) mapped.total_reviews = patch.totalReviews;
  if (patch.imageUrl !== undefined) mapped.image_url = patch.imageUrl;
  if (patch.externalUrl !== undefined) mapped.external_url = patch.externalUrl;
  if (patch.isFree !== undefined) mapped.is_free = patch.isFree;
  if (patch.certificationType !== undefined) mapped.certification_type = patch.certificationType;
  if (patch.tags !== undefined) mapped.tags = patch.tags;
  if (patch.type !== undefined) mapped.type = patch.type; // New: Update type
  if (patch.courseId !== undefined) mapped.course_id = patch.courseId; // New: Update course_id
  return supabase.from("certifications").update(mapped).eq("id", id);
}

export async function deleteCertification(id: string) {
  return supabase.from("certifications").delete().eq("id", id);
}

// Courses CRUD (These functions seem to operate on the 'courses' table already)
export async function createCourse(input: CourseInput) {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (profileError || !profileData) {
    throw new Error('User profile not found or not authenticated.');
  }

  return supabase.from("courses").insert({
    title: input.title,
    description: input.description ?? null,
    image_url: input.imageUrl ?? null,
    status: input.status ?? 'draft',
    created_by: profileData.id,
  });
}

export async function getCourse(id: string) {
  return supabase.from("courses").select("*, lessons(*)").eq("id", id).single();
}

export async function updateCourse(id: string, patch: Partial<CourseInput>) {
  const mapped: any = {};
  if (patch.title !== undefined) mapped.title = patch.title;
  if (patch.description !== undefined) mapped.description = patch.description;
  if (patch.imageUrl !== undefined) mapped.image_url = patch.imageUrl;
  if (patch.status !== undefined) mapped.status = patch.status;
  mapped.updated_at = new Date().toISOString();
  return supabase.from("courses").update(mapped).eq("id", id);
}

export async function deleteCourse(id: string) {
  return supabase.from("courses").delete().eq("id", id);
}

export async function listCourses() {
  return supabase.from("courses").select("*").order("created_at", { ascending: false });
}

// Lessons CRUD
export async function createLesson(input: LessonInput) {
  return supabase.from("lessons").insert({
    course_id: input.courseId,
    title: input.title,
    content: input.content ?? null,
    video_url: input.videoUrl ?? null,
    order: input.order,
  });
}

export async function getLesson(id: string) {
  return supabase.from("lessons").select("*").eq("id", id).single();
}

export async function updateLesson(id: string, patch: Partial<LessonInput>) {
  const mapped: any = {};
  if (patch.title !== undefined) mapped.title = patch.title;
  if (patch.content !== undefined) mapped.content = patch.content;
  if (patch.videoUrl !== undefined) mapped.video_url = patch.videoUrl;
  if (patch.order !== undefined) mapped.order = patch.order;
  mapped.updated_at = new Date().toISOString();
  return supabase.from("lessons").update(mapped).eq("id", id);
}

export async function deleteLesson(id: string) {
  return supabase.from("lessons").delete().eq("id", id);
}

export async function listLessons(courseId: string) {
  return supabase.from("lessons").select("*").eq("course_id", courseId).order("order");
} 