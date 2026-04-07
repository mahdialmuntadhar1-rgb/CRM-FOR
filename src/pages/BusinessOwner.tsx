import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  Plus, 
  Image as ImageIcon, 
  Send, 
  TrendingUp, 
  Users, 
  Eye, 
  MessageSquare,
  Edit3,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business, Post } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function BusinessOwner() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  useEffect(() => {
    async function fetchBusinessData() {
      try {
        // For demo, we'll fetch the first business
        const { data: businesses, error: bError } = await supabase
          .from('businesses')
          .select('*')
          .limit(1);

        if (bError) throw bError;
        if (businesses && businesses.length > 0) {
          setBusiness(businesses[0]);
          
          const { data: postsData, error: pError } = await supabase
            .from('posts')
            .select('*')
            .eq('business_id', businesses[0].id)
            .order('created_at', { ascending: false });

          if (pError) throw pError;
          setPosts(postsData || []);
        }
      } catch (error) {
        console.error('Error fetching business data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessData();
  }, []);

  const handleCreatePost = async () => {
    if (!business || !newPost.title || !newPost.content) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          business_id: business.id,
          title: newPost.title,
          content: newPost.content,
        })
        .select()
        .single();

      if (error) throw error;
      setPosts([data, ...posts]);
      setNewPost({ title: '', content: '' });
      alert('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Business Profile Found</h3>
        <p className="text-slate-500 mt-2 font-medium">Please contact support to set up your business profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-64 bg-slate-900 rounded-[40px] overflow-hidden relative group">
          <img 
            src="https://picsum.photos/seed/iraq-business/1200/400" 
            alt="Cover" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <button className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Change Cover
          </button>
        </div>
        
        <div className="px-8 -mt-20 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="w-40 h-40 bg-white rounded-[40px] border-8 border-slate-50 shadow-xl flex items-center justify-center text-slate-400 font-black text-4xl overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${business.name}`} 
                alt="Logo"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="pb-4">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{business.name}</h2>
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">{business.category} • {business.governorate}</p>
            </div>
          </div>
          <div className="pb-4 flex items-center gap-3">
            <button className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Edit Profile
            </button>
            <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Globe className="w-5 h-5" />
              View Public Page
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
            <Eye className="w-8 h-8" />
          </div>
          <h4 className="text-3xl font-black text-slate-900">1,284</h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profile Views</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h4 className="text-3xl font-black text-slate-900">42</h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">New Leads</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h4 className="text-3xl font-black text-slate-900">+12%</h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Growth Rate</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h4 className="text-3xl font-black text-slate-900">850</h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Followers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
        {/* Posts & Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Create Post */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-600" />
              Create New Post
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Post Title (e.g., New Menu Item!)" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-bold"
              />
              <textarea 
                rows={4}
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="What's happening in your business?" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium resize-none"
              />
              <div className="flex items-center justify-between pt-2">
                <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  Add Image
                </button>
                <button 
                  onClick={handleCreatePost}
                  disabled={saving || !newPost.title || !newPost.content}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Post Now
                </button>
              </div>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Recent Posts</h3>
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group">
                  <div className="p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{post.title}</h4>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {formatDistanceToNow(new Date(post.created_at))} ago
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">{post.content}</p>
                    <div className="pt-4 flex items-center gap-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-bold">124 views</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold">8 comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No posts yet. Share something with your audience!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="font-bold text-slate-900 text-lg">Business Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm font-bold text-slate-900">{business.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                  <p className="text-sm font-bold text-slate-900">{business.city}, {business.governorate}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</p>
                  <p className="text-sm font-bold text-slate-900">{business.address || 'No address provided'}</p>
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 hover:bg-slate-100 transition-all">
              Update Information
            </button>
          </div>

          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-black tracking-tight">Boost Your Reach</h3>
              <p className="mt-4 text-blue-100 text-sm leading-relaxed font-medium">
                Get your business in front of <span className="text-white font-bold">5,000+ potential customers</span> in your area with our premium outreach packages.
              </p>
              <button className="mt-6 bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all w-full">
                View Packages
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
