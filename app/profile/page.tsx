"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import Image from "next/image";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      const { data: postsData } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setPosts(postsData || []);
    }
    load();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile({...profile, avatar_url: publicUrl });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return <div className="p-10 text-center">Cargando perfil...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-4 mt-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {profile.avatar_url && <Image src={profile.avatar_url} alt="avatar" width={80} height={80} className="object-cover w-full h-full" />}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">
              {uploading? "..." : "Cambiar"}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          <div>
            <h2 className="text-xl font-bold">{profile.username}</h2>
            <p className="text-sm opacity-60">{profile.email}</p>
          </div>
          <Link href="/profile/edit" className="ml-auto px-4 py-1 border rounded-lg text-sm">Editar perfil</Link>
        </div>

        <div className="grid grid-cols-3 gap-1 mt-8">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square relative bg-gray-100">
              <Image src={post.image_url} alt="post" fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}