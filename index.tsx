import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, Menu, Video, Bell, User, Settings, CheckCircle2, 
  ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Play, 
  PlayCircle, Clock, Image as ImageIcon, Upload, X, FastForward,
  TrendingUp, TrendingDown, Hash, ImagePlus, ChevronRight, MessageSquare, Send
} from 'lucide-react';

// --- FORMATTING HELPERS ---
const formatCompact = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return Math.floor(num / 1000) + 'K'; // 294K, not 294.1K
  return Math.floor(num).toString();
};

const formatExact = (num) => Math.floor(num).toLocaleString();

const generateId = () => Math.random().toString(36).substr(2, 9);

// Default assets
const DEFAULT_PFP = "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=400";
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000";
const DEFAULT_THUMB = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&q=80&w=800";

// --- MAIN APP ---
export default function App() {
  // Simulator State
  const [day, setDay] = useState(1);
  const [momentum, setMomentum] = useState(1.0); // 1.0 = normal, > 1.5 = viral, < 0.5 = falling off

  // Channel Identity State
  const [channel, setChannel] = useState({
    name: "Placeholder Vlogs",
    handle: "placeholdervlogs",
    subCount: 45000,
    bio: "Welcome to my channel! Just trying to make it out the hood.",
    pfpUrl: DEFAULT_PFP,
    bannerUrl: DEFAULT_BANNER
  });

  // Content State
  const [content, setContent] = useState([]);
  
  // UI State
  const [view, setView] = useState('channel'); // 'channel', 'watch', 'shorts'
  const [activeTab, setActiveTab] = useState('Videos'); // Videos, Shorts, Releases, Community
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [interactions, setInteractions] = useState({}); // Stores likes/dislikes by video ID
  const [commentInputs, setCommentInputs] = useState({});
  const [showShortsComments, setShowShortsComments] = useState(null);
  
  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Forms
  const [uploadForm, setUploadForm] = useState({ type: 'Video', title: '', desc: '', fileUrl: null });
  const [editForm, setEditForm] = useState({ ...channel });

  // Watch Page State
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  // Derived Total Views
  const totalViews = content.reduce((sum, item) => sum + (item.views || 0), 0);

  // --- ACTIONS ---

  const handleCreateContent = () => {
    if (!uploadForm.title && uploadForm.type !== 'Community') return;
    if (uploadForm.type === 'Community' && !uploadForm.desc) return;

    const newContent = {
      id: generateId(),
      type: uploadForm.type,
      title: uploadForm.title,
      description: uploadForm.desc || "No description provided.",
      thumbnail: uploadForm.fileUrl || DEFAULT_THUMB,
      views: 0,
      likes: 0,
      dislikes: 0,
      comments: [],
      releaseDay: day,
      quality: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
    };

    setContent([newContent, ...content]);
    setShowUpload(false);
    setUploadForm({ type: 'Video', title: '', desc: '', fileUrl: null });
    
    // Boost momentum on upload
    setMomentum(prev => Math.min(prev + 0.3, 2.5));
  };

  const handleSaveProfile = () => {
    setChannel(editForm);
    setShowEditProfile(false);
  };

  const simulateDay = () => {
    let newSubs = 0;

    const updatedContent = content.map(item => {
      const age = day - item.releaseDay + 1;

      if (item.type === 'Community') {
          // Community posts get likes but no views
          const decayFactor = Math.max(0.01, 1 / Math.pow(age, 1.2));
          const newLikes = Math.floor((channel.subCount * 0.05) * momentum * decayFactor);
          if (newLikes > 0) return { ...item, likes: item.likes + newLikes };
          return item;
      }

      const baseInterest = (channel.subCount * 0.15) * item.quality * momentum;
      
      // Different decay profiles for different content types
      let decayFactor = 1;
      if (item.type === 'Short') {
        decayFactor = age <= 3 ? 1.5 : Math.max(0.001, 1 / Math.pow(age, 1.5)); // Shorts die fast
      } else if (item.type === 'Release') {
        decayFactor = Math.max(0.01, 1 / Math.pow(age, 0.5)); // Music lasts long
      } else {
        decayFactor = Math.max(0.005, 1 / Math.pow(age, 0.8)); // Standard video
      }

      const newViewsToday = Math.floor(baseInterest * decayFactor);

      if (newViewsToday > 0) {
        // ~4% of viewers like the video
        const newLikes = Math.floor(newViewsToday * 0.04);
        return { ...item, views: item.views + newViewsToday, likes: item.likes + newLikes };
      }
      return item;
    });

    // Sub growth based on momentum
    if (momentum > 1.0) {
      newSubs = Math.floor(channel.subCount * 0.003 * momentum);
    } else if (momentum < 0.8 && channel.subCount > 100) {
      newSubs = -Math.floor(channel.subCount * 0.001 * (1 - momentum)); // Lose subs if falling off
    }

    setContent(updatedContent);
    setChannel(prev => ({ ...prev, subCount: Math.max(10, prev.subCount + newSubs) }));
    setDay(prev => prev + 1);
    
    // Natural momentum decay over time
    setMomentum(prev => {
      if (prev > 1.0) return Math.max(1.0, prev - 0.05);
      if (prev < 1.0) return Math.min(1.0, prev + 0.02);
      return prev;
    });
  };

  const toggleInteraction = (id, type) => {
    const current = interactions[id];
    let next = { ...interactions };
    
    setContent(content.map(c => {
      if (c.id !== id) return c;
      let cLike = c.likes;
      let cDislike = c.dislikes || 0;
      
      if (current === 'like') cLike = Math.max(0, cLike - 1);
      if (current === 'dislike') cDislike = Math.max(0, cDislike - 1);

      if (current !== type) {
          if (type === 'like') {
              cLike += 1;
              if (c.type !== 'Community') { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 400); }
          }
          if (type === 'dislike') cDislike += 1;
          next[id] = type;
      } else {
          delete next[id]; // Toggle off
      }
      
      return { ...c, likes: cLike, dislikes: cDislike };
    }));
    
    setInteractions(next);
  };

  const handleAddComment = (id) => {
    const text = commentInputs[id];
    if (!text || !text.trim()) return;
    setContent(content.map(c => c.id === id ? {
        ...c,
        comments: [{ id: generateId(), author: channel.name, pfp: channel.pfpUrl, text: text.trim() }, ...(c.comments || [])]
    } : c));
    setCommentInputs({ ...commentInputs, [id]: '' });
  };

  const playVideo = (id) => {
    setCurrentVideoId(id);
    setView('watch');
    setIsDescExpanded(false);
    window.scrollTo(0, 0);
  };

  // --- RENDERERS ---

  const renderTopNav = () => (
    <div className="flex items-center justify-between px-4 h-14 bg-[#0f0f0f] sticky top-0 z-40 border-b border-[#303030]">
      <div className="flex items-center space-x-4">
        <Menu onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="text-white cursor-pointer hover:bg-[#272727] rounded-full p-1 w-10 h-10" />
        <div className="flex items-center cursor-pointer" onClick={() => setView('channel')}>
          <div className="bg-red-600 rounded-lg w-8 h-6 flex items-center justify-center mr-1">
            <Play fill="white" size={14} className="ml-0.5" />
          </div>
          <span className="text-white font-bold text-xl tracking-tighter">YouTube</span>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-2xl mx-12 items-center">
        <div className="flex w-full bg-[#121212] border border-[#303030] rounded-full overflow-hidden">
          <div className="pl-4 py-2 flex-1"><input type="text" placeholder="Search" className="w-full bg-transparent outline-none text-white" /></div>
          <button className="bg-[#222222] px-6 py-2 border-l border-[#303030] hover:bg-[#303030] transition-colors"><Search size={20} className="text-white" /></button>
        </div>
        <div className="w-10 h-10 bg-[#222222] rounded-full flex items-center justify-center ml-4 hover:bg-[#303030] cursor-pointer">
           <PlayCircle className="text-white" size={20} />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <button onClick={() => setShowUpload(true)} className="text-white hover:bg-[#272727] p-2 rounded-full hidden sm:block">
          <Video size={24} />
        </button>
        <button className="text-white hover:bg-[#272727] p-2 rounded-full hidden sm:block">
          <Bell size={24} />
        </button>
        <img src={channel.pfpUrl} alt="pfp" className="w-8 h-8 rounded-full cursor-pointer border border-[#303030]" onClick={() => setView('channel')} />
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className={`bg-[#0f0f0f] h-[calc(100vh-3.5rem)] sticky top-14 hidden md:flex flex-col py-3 border-r border-[#303030] overflow-y-auto transition-all duration-300 ${isSidebarExpanded ? 'w-60' : 'w-[72px]'}`}>
      <div className="flex flex-col space-y-1 px-2">
        <div className={`flex items-center p-3 rounded-lg hover:bg-[#272727] cursor-pointer text-white ${!isSidebarExpanded ? 'flex-col justify-center' : ''}`} onClick={() => setView('channel')}>
          <Home size={24} className={isSidebarExpanded ? "mr-5" : "mb-1"} />
          <span className={isSidebarExpanded ? "text-sm" : "text-[10px]"}>Home</span>
        </div>
        <div className={`flex items-center p-3 rounded-lg hover:bg-[#272727] cursor-pointer text-white ${!isSidebarExpanded ? 'flex-col justify-center' : ''}`} onClick={() => setView('shorts')}>
          <PlayCircle size={24} className={isSidebarExpanded ? "mr-5" : "mb-1"} />
          <span className={isSidebarExpanded ? "text-sm" : "text-[10px]"}>Shorts</span>
        </div>
        <div className={`flex items-center p-3 rounded-lg hover:bg-[#272727] cursor-pointer text-white ${!isSidebarExpanded ? 'flex-col justify-center' : ''}`}>
          <Video size={24} className={isSidebarExpanded ? "mr-5" : "mb-1"} />
          <span className={isSidebarExpanded ? "text-sm" : "text-[10px]"}>Subscriptions</span>
        </div>
      </div>
      <div className="border-t border-[#303030] my-3 mx-2 hidden lg:block" />
      {isSidebarExpanded && (
        <div className="flex flex-col space-y-1 px-2 hidden lg:flex">
          <div className="px-3 py-2 text-white font-bold text-base flex items-center">You <ChevronRight size={16} className="ml-1"/></div>
          <div className="flex items-center p-3 rounded-lg hover:bg-[#272727] cursor-pointer text-white" onClick={() => setView('channel')}>
            <User size={24} className="mr-5" />
            <span className="text-sm">Your channel</span>
          </div>
          <div className="flex items-center p-3 rounded-lg hover:bg-[#272727] cursor-pointer text-white">
            <Clock size={24} className="mr-5" />
            <span className="text-sm">History</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderChannel = () => {
    const activeContent = content.filter(c => c.type === (activeTab === 'Releases' ? 'Release' : activeTab === 'Shorts' ? 'Short' : activeTab === 'Videos' ? 'Video' : 'Community'));

    return (
      <div className="flex-1 bg-[#0f0f0f] overflow-y-auto">
        {/* Banner */}
        <div className="w-full h-32 md:h-56 lg:h-64 object-cover relative">
          <img src={channel.bannerUrl} alt="banner" className="w-full h-full object-cover" />
        </div>

        <div className="max-w-[1280px] mx-auto px-4 lg:px-12 pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center mt-6 mb-6">
            <img src={channel.pfpUrl} alt="pfp" className="w-20 h-20 md:w-32 md:h-32 rounded-full mr-6 border border-[#303030]" />
            <div className="flex-1 mt-4 md:mt-0">
              <h1 className="text-3xl font-bold text-white flex items-center">
                {channel.name} 
                <CheckCircle2 size={18} className="text-[#0f0f0f] ml-1.5 inline-block" fill="#aaaaaa" stroke="#aaaaaa" />
              </h1>
              <div className="text-[#aaaaaa] text-sm mt-1 mb-2">
                @{channel.handle} • {formatCompact(channel.subCount)} subscribers • {content.filter(c => c.type !== 'Community').length} videos
              </div>
              <p className="text-[#aaaaaa] text-sm max-w-2xl mb-4 line-clamp-2">{channel.bio}</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowEditProfile(true)} className="bg-[#272727] hover:bg-[#3f3f3f] text-white px-4 py-2 rounded-full text-sm font-bold transition-colors">
                  Customize channel
                </button>
                <button onClick={() => setShowEditProfile(true)} className="bg-[#272727] hover:bg-[#3f3f3f] text-white px-4 py-2 rounded-full text-sm font-bold transition-colors">
                  Manage videos
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b border-[#303030] mb-6">
            {['Videos', 'Shorts', 'Releases', 'Community'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-bold uppercase ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-[#aaaaaa] hover:text-white transition-colors'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          {activeTab === 'Community' ? (
             <div className="max-w-2xl mx-auto space-y-6">
               {activeContent.length === 0 && <p className="text-gray-500 text-center py-10">No community posts yet.</p>}
               {activeContent.map(post => (
                 <div key={post.id} className="bg-[#0f0f0f] border border-[#303030] p-4 rounded-xl">
                   <div className="flex items-center mb-3">
                     <img src={channel.pfpUrl} alt="pfp" className="w-10 h-10 rounded-full mr-3" />
                     <div>
                       <p className="text-white font-bold text-sm flex items-center">
                         {channel.name} <CheckCircle2 size={12} className="text-[#0f0f0f] ml-1 inline-block" fill="#aaaaaa" />
                       </p>
                       <p className="text-[#aaaaaa] text-xs">Day {post.releaseDay}</p>
                     </div>
                   </div>
                   <p className="text-white text-sm mb-3 whitespace-pre-wrap">{post.description}</p>
                   {post.thumbnail !== DEFAULT_THUMB && (
                     <img src={post.thumbnail} alt="post" className="w-full rounded-xl max-h-96 object-cover border border-[#303030] mb-3" />
                   )}
                   <div className="flex items-center text-[#aaaaaa] space-x-6 text-sm mt-2">
                     <div className="flex items-center cursor-pointer hover:text-white" onClick={() => toggleInteraction(post.id, 'like')}><ThumbsUp size={18} fill={interactions[post.id] === 'like' ? "white" : "none"} className="mr-2"/> {formatCompact(post.likes)}</div>
                     <div className="flex items-center cursor-pointer hover:text-white" onClick={() => toggleInteraction(post.id, 'dislike')}><ThumbsDown size={18} fill={interactions[post.id] === 'dislike' ? "white" : "none"} /></div>
                     <div className="flex items-center cursor-pointer hover:text-white"><Share2 size={18}/></div>
                   </div>
                 </div>
               ))}
             </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`}>
              {activeContent.length === 0 && <p className="text-gray-500 col-span-full">No {activeTab.toLowerCase()} uploaded yet.</p>}
              {activeContent.map((video) => (
                <div key={video.id} className="cursor-pointer group flex flex-col" onClick={() => playVideo(video.id)}>
                  <div className={`relative w-full rounded-xl overflow-hidden mb-3 ${activeTab === 'Shorts' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                    <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="thumb" />
                    {activeTab !== 'Shorts' && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                        {video.type === 'Release' ? '3:24' : '10:05'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start">
                    {activeTab !== 'Shorts' && <img src={channel.pfpUrl} className="w-9 h-9 rounded-full mr-3 hidden sm:block lg:hidden" alt="pfp"/>}
                    <div className="flex-1 pr-4">
                      <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-blue-400">{video.title}</h3>
                      <p className="text-[#aaaaaa] text-xs mt-1">{formatCompact(video.views)} views • Day {video.releaseDay}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWatch = () => {
    const video = content.find(c => c.id === currentVideoId);
    if (!video) return null;

    const recommended = content.filter(c => c.id !== video.id && c.type !== 'Community').slice(0, 10);

    return (
      <div className="flex-1 bg-[#0f0f0f] overflow-y-auto flex flex-col lg:flex-row px-4 lg:px-8 py-6">
        {/* Main Watch Area */}
        <div className="flex-1 lg:pr-6 max-w-6xl">
          {/* Player Placeholder */}
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg border border-[#303030]">
             <img src={video.thumbnail} className="w-full h-full object-cover opacity-80" alt="player" />
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="bg-black/50 rounded-full p-4 group-hover:bg-red-600 transition-colors cursor-pointer">
                 <Play fill="white" size={48} className="ml-2" />
               </div>
             </div>
             {/* Fake Player UI */}
             <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30"><div className="w-1/3 h-full bg-red-600 relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full scale-0 group-hover:scale-100 transition-transform"></div></div></div>
          </div>

          <h1 className="text-white text-xl font-bold mt-4">{video.title}</h1>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 mb-4 space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <img src={channel.pfpUrl} alt="pfp" className="w-10 h-10 rounded-full mr-3 cursor-pointer" onClick={() => setView('channel')} />
              <div>
                <p className="text-white font-bold text-base flex items-center cursor-pointer" onClick={() => setView('channel')}>
                  {channel.name} <CheckCircle2 size={14} className="text-[#0f0f0f] ml-1 inline-block" fill="#aaaaaa" />
                </p>
                <p className="text-[#aaaaaa] text-xs">{formatCompact(channel.subCount)} subscribers</p>
              </div>
              <button className="ml-6 bg-white text-black font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
                Subscribe
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-[#272727] rounded-full overflow-hidden">
                <button 
                  onClick={() => toggleInteraction(video.id, 'like')} 
                  className="flex items-center px-4 py-2 hover:bg-[#3f3f3f] border-r border-[#3f3f3f] text-white font-bold text-sm transition-colors"
                >
                  <ThumbsUp 
                    size={18} 
                    className={`mr-2 transition-transform duration-300 ${likeAnim ? 'scale-150 rotate-12 text-white' : 'scale-100 text-white'}`} 
                    fill={interactions[video.id] === 'like' ? "white" : "none"} 
                  /> 
                  {formatCompact(video.likes)}
                </button>
                <button 
                  onClick={() => toggleInteraction(video.id, 'dislike')}
                  className="px-4 py-2 hover:bg-[#3f3f3f] text-white transition-colors"
                >
                  <ThumbsDown size={18} fill={interactions[video.id] === 'dislike' ? "white" : "none"} />
                </button>
              </div>
              <button className="flex items-center px-4 py-2 bg-[#272727] hover:bg-[#3f3f3f] rounded-full text-white font-bold text-sm transition-colors hidden sm:flex">
                <Share2 size={18} className="mr-2"/> Share
              </button>
              <button className="flex items-center px-4 py-2 bg-[#272727] hover:bg-[#3f3f3f] rounded-full text-white font-bold text-sm transition-colors hidden sm:flex">
                <Download size={18} className="mr-2"/> Download
              </button>
              <button className="p-2 bg-[#272727] hover:bg-[#3f3f3f] rounded-full text-white transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div 
            onClick={() => setIsDescExpanded(!isDescExpanded)} 
            className="bg-[#272727] hover:bg-[#3f3f3f] p-3 rounded-xl cursor-pointer transition-colors"
          >
            <div className="text-white text-sm font-bold mb-1">
              {isDescExpanded ? formatExact(video.views) : formatCompact(video.views)} views  •  Day {video.releaseDay}
            </div>
            <div className={`text-white text-sm whitespace-pre-wrap ${!isDescExpanded && 'line-clamp-2'}`}>
              {video.description}
            </div>
            {!isDescExpanded && <div className="text-white text-sm font-bold mt-1">Show more</div>}
            {isDescExpanded && <div className="text-white text-sm font-bold mt-4">Show less</div>}
          </div>

          {/* Comments Section */}
          <div className="mt-6">
            <h3 className="text-white font-bold text-xl mb-4">{video.comments?.length || 0} Comments</h3>
            <div className="flex space-x-4 mb-8">
              <img src={channel.pfpUrl} alt="pfp" className="w-10 h-10 rounded-full" />
              <div className="flex-1 flex flex-col items-end">
                <input 
                  type="text" 
                  value={commentInputs[video.id] || ''}
                  onChange={(e) => setCommentInputs({...commentInputs, [video.id]: e.target.value})}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleAddComment(video.id) }}
                  placeholder="Add a comment..."
                  className="w-full bg-transparent border-b border-[#303030] focus:border-white outline-none text-white pb-1 text-sm transition-colors"
                />
                <button 
                  onClick={() => handleAddComment(video.id)}
                  disabled={!commentInputs[video.id]?.trim()}
                  className="mt-2 bg-blue-500 hover:bg-blue-600 disabled:bg-[#272727] disabled:text-[#aaaaaa] text-white font-bold px-4 py-2 rounded-full text-sm transition-colors"
                >
                  Comment
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {video.comments?.map(c => (
                <div key={c.id} className="flex space-x-4">
                  <img src={c.pfp} alt="pfp" className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="flex items-center mb-1">
                      <span className="text-white text-xs font-bold mr-2">{c.author}</span>
                      <span className="text-[#aaaaaa] text-xs">Just now</span>
                    </div>
                    <p className="text-white text-sm">{c.text}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <ThumbsUp size={14} className="text-white cursor-pointer hover:text-gray-400" />
                      <ThumbsDown size={14} className="text-white cursor-pointer hover:text-gray-400" />
                      <span className="text-white text-xs font-bold cursor-pointer hover:text-gray-400">Reply</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Recommended */}
        <div className="w-full lg:w-[400px] mt-6 lg:mt-0 flex flex-col space-y-2">
          {recommended.map((vid) => (
            <div key={vid.id} className="flex group cursor-pointer" onClick={() => playVideo(vid.id)}>
               <div className="w-40 min-w-[160px] aspect-video rounded-lg overflow-hidden relative mr-2">
                 <img src={vid.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="thumb"/>
                 <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded font-bold">
                    10:05
                  </div>
               </div>
               <div className="flex flex-col py-1 pr-2">
                 <h3 className="text-white text-sm font-bold line-clamp-2 group-hover:text-blue-400 leading-tight mb-1">{vid.title}</h3>
                 <p className="text-[#aaaaaa] text-xs">{channel.name}</p>
                 <p className="text-[#aaaaaa] text-xs">{formatCompact(vid.views)} views • Day {vid.releaseDay}</p>
               </div>
            </div>
          ))}
          {recommended.length === 0 && <p className="text-[#aaaaaa] text-sm p-4">No recommended videos.</p>}
        </div>
      </div>
    );
  };

  const renderShorts = () => {
    const shortsList = content.filter(c => c.type === 'Short');
    if (shortsList.length === 0) return <div className="flex-1 bg-[#0f0f0f] text-white flex justify-center items-center font-bold text-xl py-20">No shorts uploaded yet.</div>;

    return (
      <div className="flex-1 bg-[#0f0f0f] overflow-y-scroll snap-y snap-mandatory h-[calc(100vh-3.5rem)] flex flex-col items-center hide-scrollbar">
        {shortsList.map(short => (
          <div key={short.id} className="w-full h-full snap-start snap-always flex justify-center py-4 relative shrink-0">
             <div className="relative w-full max-w-[400px] h-full sm:h-[calc(100vh-6rem)] bg-black rounded-xl overflow-hidden shadow-xl border border-[#303030]">
               <img src={short.thumbnail} className="w-full h-full object-cover opacity-90" alt="short" />
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                 <Play fill="white" size={64} className="ml-2 text-white/50" />
               </div>
               
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                 <div className="flex items-center mb-3">
                   <img src={channel.pfpUrl} alt="pfp" className="w-9 h-9 rounded-full mr-2 border border-[#303030]" />
                   <span className="text-white font-bold text-sm mr-3">@{channel.handle}</span>
                   <button className="bg-white text-black font-bold text-xs px-3 py-1.5 rounded-full">Subscribe</button>
                 </div>
                 <p className="text-white text-sm font-medium line-clamp-2">{short.title}</p>
               </div>

               {/* Right side buttons */}
               <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-5">
                 <div className="flex flex-col items-center">
                   <div onClick={() => toggleInteraction(short.id, 'like')} className="bg-black/60 p-3 rounded-full mb-1 cursor-pointer hover:bg-black/80 transition-colors">
                     <ThumbsUp size={24} fill={interactions[short.id] === 'like' ? "white" : "none"} className="text-white" />
                   </div>
                   <span className="text-white text-xs font-bold">{formatCompact(short.likes)}</span>
                 </div>
                 <div className="flex flex-col items-center">
                   <div onClick={() => toggleInteraction(short.id, 'dislike')} className="bg-black/60 p-3 rounded-full mb-1 cursor-pointer hover:bg-black/80 transition-colors">
                     <ThumbsDown size={24} fill={interactions[short.id] === 'dislike' ? "white" : "none"} className="text-white" />
                   </div>
                   <span className="text-white text-xs font-bold">Dislike</span>
                 </div>
                 <div className="flex flex-col items-center">
                   <div onClick={() => setShowShortsComments(short.id)} className="bg-black/60 p-3 rounded-full mb-1 cursor-pointer hover:bg-black/80 transition-colors">
                     <MessageSquare size={24} className="text-white" />
                   </div>
                   <span className="text-white text-xs font-bold">{formatCompact(short.comments?.length || 0)}</span>
                 </div>
                 <div className="flex flex-col items-center">
                   <div className="bg-black/60 p-3 rounded-full mb-1 cursor-pointer hover:bg-black/80 transition-colors">
                     <Share2 size={24} className="text-white" />
                   </div>
                   <span className="text-white text-xs font-bold">Share</span>
                 </div>
               </div>

               {/* Comments Overlay */}
               {showShortsComments === short.id && (
                 <div className="absolute inset-x-0 bottom-0 top-1/4 bg-[#0f0f0f]/95 backdrop-blur-md rounded-t-2xl z-10 flex flex-col border-t border-[#303030] animate-slideUp">
                   <div className="flex justify-between items-center p-4 border-b border-[#303030]">
                     <h3 className="font-bold text-white text-lg">Comments</h3>
                     <X size={20} className="cursor-pointer text-white hover:text-gray-400" onClick={() => setShowShortsComments(null)}/>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {short.comments?.map(c => (
                       <div key={c.id} className="flex space-x-3">
                         <img src={c.pfp} className="w-8 h-8 rounded-full" alt="pfp" />
                         <div>
                           <div className="flex items-center mb-0.5">
                             <span className="text-xs text-[#aaaaaa] font-bold mr-2">{c.author}</span>
                           </div>
                           <p className="text-sm text-white">{c.text}</p>
                         </div>
                       </div>
                     ))}
                     {(!short.comments || short.comments.length === 0) && <p className="text-sm text-center text-[#aaaaaa] mt-10">No comments yet.</p>}
                   </div>
                   <div className="p-3 border-t border-[#303030] flex space-x-2">
                     <img src={channel.pfpUrl} className="w-8 h-8 rounded-full" alt="pfp" />
                     <div className="flex-1 bg-[#272727] rounded-full px-4 py-1 flex items-center">
                       <input 
                         type="text" 
                         value={commentInputs[short.id] || ''}
                         onChange={(e) => setCommentInputs({...commentInputs, [short.id]: e.target.value})}
                         placeholder="Add a comment..."
                         className="bg-transparent outline-none w-full text-sm text-white"
                         onKeyDown={(e) => { if(e.key === 'Enter') handleAddComment(short.id) }}
                       />
                       <Send size={16} className={`cursor-pointer transition-colors ${commentInputs[short.id]?.trim() ? 'text-blue-500 hover:text-blue-400' : 'text-[#aaaaaa]'}`} onClick={() => handleAddComment(short.id)} />
                     </div>
                   </div>
                 </div>
               )}
             </div>
          </div>
        ))}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    );
  };

  // --- OVERLAYS ---

  const renderSimulatorControls = () => (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4 pointer-events-none">
      <div className="bg-[#121212]/90 backdrop-blur border border-[#303030] p-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col items-end w-64 transition-all hover:border-red-600/50">
        <div className="flex justify-between w-full items-center mb-3">
           <span className="text-white font-bold text-sm flex items-center">
             <Settings size={14} className="mr-1 text-[#aaaaaa]" /> Simulator
           </span>
           <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">Day {day}</span>
        </div>
        
        {/* Total Views Odometer */}
        <div className="w-full bg-black rounded-lg p-2 mb-4 border border-[#222222]">
           <p className="text-[#aaaaaa] text-[10px] uppercase font-bold tracking-wider mb-1">Total Views</p>
           <div className="flex justify-end overflow-hidden h-8">
             {totalViews.toString().split('').map((digit, i) => (
                <div key={`${i}-${totalViews}`} className="animate-slideUp bg-[#1a1a1a] text-white font-mono text-xl font-bold px-1.5 mx-[1px] rounded border border-[#333]">
                  {digit}
                </div>
             ))}
             {totalViews === 0 && <div className="bg-[#1a1a1a] text-white font-mono text-xl font-bold px-1.5 mx-[1px] rounded border border-[#333]">0</div>}
           </div>
        </div>

        <button 
          onClick={simulateDay}
          className="w-full bg-white text-black font-bold py-2 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center"
        >
          <FastForward size={18} className="mr-2" /> Next Day
        </button>
      </div>
    </div>
  );

  const renderEditProfile = () => {
    if (!showEditProfile) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#222222] rounded-xl w-full max-w-md p-6 border border-[#303030]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Edit Profile</h2>
            <X className="text-white cursor-pointer hover:text-gray-400" onClick={() => setShowEditProfile(false)} />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#aaaaaa] uppercase font-bold">Channel Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#aaaaaa] uppercase font-bold">Handle</label>
              <input type="text" value={editForm.handle} onChange={e => setEditForm({...editForm, handle: e.target.value})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#aaaaaa] uppercase font-bold">Bio</label>
              <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white mt-1 h-20 resize-none" />
            </div>
            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg">
               <label className="text-xs text-red-400 uppercase font-bold flex items-center"><Hash size={12} className="mr-1"/> Sandbox: Sub Count</label>
               <input type="number" value={editForm.subCount} onChange={e => setEditForm({...editForm, subCount: Number(e.target.value)})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white mt-1 font-mono" />
               <div className="flex space-x-2 mt-2">
                 <button onClick={() => setMomentum(2.0)} className="flex-1 bg-[#1a1a1a] text-green-400 text-xs py-1 rounded border border-[#303030] hover:bg-[#2a2a2a]">Force Viral</button>
                 <button onClick={() => setMomentum(0.2)} className="flex-1 bg-[#1a1a1a] text-red-400 text-xs py-1 rounded border border-[#303030] hover:bg-[#2a2a2a]">Force Fall Off</button>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#aaaaaa] uppercase font-bold mb-1 block">Profile Picture</label>
                <label className="cursor-pointer bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white text-xs flex items-center justify-center hover:bg-[#303030]">
                  <Upload size={14} className="mr-2"/> Upload PFP
                  <input type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) setEditForm({...editForm, pfpUrl: URL.createObjectURL(e.target.files[0])}) }} />
                </label>
              </div>
              <div>
                <label className="text-xs text-[#aaaaaa] uppercase font-bold mb-1 block">Banner Image</label>
                <label className="cursor-pointer bg-[#0f0f0f] border border-[#303030] rounded p-2 text-white text-xs flex items-center justify-center hover:bg-[#303030]">
                  <Upload size={14} className="mr-2"/> Upload Banner
                  <input type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) setEditForm({...editForm, bannerUrl: URL.createObjectURL(e.target.files[0])}) }} />
                </label>
              </div>
            </div>
          </div>
          <button onClick={handleSaveProfile} className="w-full mt-6 bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200">Save Changes</button>
        </div>
      </div>
    );
  };

  const renderCreateContent = () => {
    if (!showUpload) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#222222] rounded-xl w-full max-w-md p-6 border border-[#303030]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Create Content</h2>
            <X className="text-white cursor-pointer hover:text-gray-400" onClick={() => setShowUpload(false)} />
          </div>
          
          <div className="flex space-x-2 mb-6">
            {['Video', 'Short', 'Release', 'Community'].map(t => (
              <button 
                key={t} onClick={() => setUploadForm({...uploadForm, type: t})}
                className={`flex-1 py-1 text-xs font-bold rounded-full border ${uploadForm.type === t ? 'bg-white text-black border-white' : 'bg-[#0f0f0f] text-white border-[#303030] hover:bg-[#303030]'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {uploadForm.type !== 'Community' && (
              <div>
                <label className="text-xs text-[#aaaaaa] uppercase font-bold">Title</label>
                <input type="text" placeholder={`Add a title that describes your ${uploadForm.type}`} value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-3 text-white mt-1" />
              </div>
            )}
            <div>
              <label className="text-xs text-[#aaaaaa] uppercase font-bold">Description / Text</label>
              <textarea placeholder={uploadForm.type === 'Community' ? "What's on your mind?" : "Tell viewers about your video"} value={uploadForm.desc} onChange={e => setUploadForm({...uploadForm, desc: e.target.value})} className="w-full bg-[#0f0f0f] border border-[#303030] rounded p-3 text-white mt-1 h-24 resize-none" />
            </div>
            <div>
              <label className="text-xs text-[#aaaaaa] uppercase font-bold mb-1 block">Image / Thumbnail</label>
              <div className="relative w-full h-32 bg-[#0f0f0f] border-2 border-dashed border-[#303030] rounded-xl flex items-center justify-center group hover:border-[#aaaaaa] cursor-pointer overflow-hidden">
                 {uploadForm.fileUrl ? (
                   <img src={uploadForm.fileUrl} className="w-full h-full object-cover" alt="preview" />
                 ) : (
                   <div className="flex flex-col items-center text-[#aaaaaa]">
                     <ImagePlus size={32} className="mb-2" />
                     <span className="text-xs">Click to upload</span>
                   </div>
                 )}
                 <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => { if(e.target.files[0]) setUploadForm({...uploadForm, fileUrl: URL.createObjectURL(e.target.files[0])}) }} />
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleCreateContent} 
            disabled={(uploadForm.type !== 'Community' && !uploadForm.title) || (uploadForm.type === 'Community' && !uploadForm.desc)}
            className={`w-full mt-6 font-bold py-3 rounded-full flex justify-center items-center ${((uploadForm.type !== 'Community' && !uploadForm.title) || (uploadForm.type === 'Community' && !uploadForm.desc)) ? 'bg-[#303030] text-[#aaaaaa] cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500'}`}
          >
            <Upload size={18} className="mr-2" /> Post {uploadForm.type}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] font-sans text-white overflow-hidden">
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
      
      {renderTopNav()}
      
      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        {view === 'channel' && renderChannel()}
        {view === 'watch' && renderWatch()}
        {view === 'shorts' && renderShorts()}
      </div>

      {/* Floating Simulator Engine */}
      {renderSimulatorControls()}

      {/* Modals */}
      {renderEditProfile()}
      {renderCreateContent()}
    </div>
  );
}