"use client";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import PostCard from "./components/PostCard";
import BottomNav from "./components/BottomNav"; // o donde tengas tu nav
import { useRouter } from "next/navigation";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // 1. CHECAR SI ESTÁ LOGUEADO, si no, al login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. TRAER POSTS
      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (!postsData) {
        setLoading(false);
        return;
      }

      const userIds = [...new Set(postsData.map((p: any) => p.user_id))] as string[];

      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds);

      // 3. TRAER MIS LIKES PARA SABER CUALES YA TENGO LIKEADOS
      const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
      const likedSet = new Set(myLikes?.map((l: any) => l.post_id));

      const map = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
      const mapped = postsData.map((p: any) => ({
        id: p.id,
        image_url: p.image_url,
        caption: p.caption,
        likes: p.likes?? 0,
        isLiked: likedSet.has(p.id),
        created_at: p.created_at,
        user: {
          username: map.get(p.user_id)?.username || "leii",
          avatar: map.get(p.user_id)?.avatar_url
        }
      }));
      setPosts(mapped);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleLike = async (postId: number | string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newIsLiked =!post.isLiked;
    const newLikes = newIsLiked? post.likes + 1 : post.likes - 1;

    // Actualización optimista (se ve al instante)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId? {...p, isLiked: newIsLiked, likes: newLikes } : p
      )
    );

    try {
      if (newIsLiked) {
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
      } else {
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      }
      await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
    } catch (e) {
      console.error("Error guardando like", e);
      // Revertir si falla
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId? {...p, isLiked:!newIsLiked, likes: post.likes } : p
        )
      );
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando Supagram...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-center">
          <h1 className="text-2xl font-bold text-primary">Supagram</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={handleLike} />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}