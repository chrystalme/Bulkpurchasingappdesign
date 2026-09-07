import { useState } from 'react';
import {
  Users, ShoppingCart, TrendingDown, Star, ArrowRight,
  Shield, MessageSquare, ChevronRight, Zap, Package,
  MapPin, Clock, Check
} from 'lucide-react';

interface WelcomeProps {
  onGetStarted: () => void;
}

const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: 'Premium Basmati Rice',
    unit: '25kg sack',
    originalPrice: 4200,
    groupPrice: 3100,
    savings: 26,
    image: 'https://images.unsplash.com/photo-1568347355280-d33fdf77d42a?w=400&h=300&fit=crop&auto=format',
    vendor: 'Farmgate Direct',
    groupsActive: 14,
    minMembers: 5,
    category: 'Grains',
  },
  {
    id: 2,
    name: 'Cold-Pressed Sunflower Oil',
    unit: '20L drum',
    originalPrice: 8500,
    groupPrice: 6200,
    savings: 27,
    image: 'https://images.unsplash.com/photo-1654245201134-49f7e8115817?w=400&h=300&fit=crop&auto=format',
    vendor: 'NaturalPress Co.',
    groupsActive: 9,
    minMembers: 4,
    category: 'Oils',
  },
  {
    id: 3,
    name: 'Organic Mixed Vegetables',
    unit: '10kg box',
    originalPrice: 2800,
    groupPrice: 1950,
    savings: 30,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop&auto=format',
    vendor: 'Green Valley Farm',
    groupsActive: 22,
    minMembers: 3,
    category: 'Produce',
  },
  {
    id: 4,
    name: 'Raw Organic Honey',
    unit: '5kg jar set',
    originalPrice: 6500,
    groupPrice: 4800,
    savings: 26,
    image: 'https://images.unsplash.com/photo-1654245201134-49f7e8115817?w=400&h=300&fit=crop&auto=format',
    vendor: 'BeeKeepers Guild',
    groupsActive: 7,
    minMembers: 3,
    category: 'Pantry',
  },
  {
    id: 5,
    name: 'Fresh Tomatoes',
    unit: '20kg crate',
    originalPrice: 3200,
    groupPrice: 2100,
    savings: 34,
    image: 'https://images.unsplash.com/photo-1485637701894-09ad422f6de6?w=400&h=300&fit=crop&auto=format',
    vendor: 'Sunrise Farms',
    groupsActive: 31,
    minMembers: 5,
    category: 'Produce',
  },
];

const FEATURED_VENDORS = [
  {
    id: 1,
    name: 'Farmgate Direct',
    tagline: 'Farm-to-doorstep staples',
    rating: 4.9,
    reviews: 312,
    location: 'Lagos, NG',
    fulfillmentTime: '2–3 days',
    specialties: ['Grains', 'Legumes', 'Cereals'],
    groupsCompleted: 148,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=300&h=200&fit=crop&auto=format',
    verified: true,
    savingsAvg: 28,
  },
  {
    id: 2,
    name: 'Green Valley Farm',
    tagline: 'Certified organic fresh produce',
    rating: 4.8,
    reviews: 207,
    location: 'Abuja, NG',
    fulfillmentTime: '1–2 days',
    specialties: ['Vegetables', 'Fruits', 'Herbs'],
    groupsCompleted: 93,
    image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=300&h=200&fit=crop&auto=format',
    verified: true,
    savingsAvg: 31,
  },
  {
    id: 3,
    name: 'NaturalPress Co.',
    tagline: 'Cold-pressed oils & pantry staples',
    rating: 4.7,
    reviews: 184,
    location: 'Kano, NG',
    fulfillmentTime: '3–5 days',
    specialties: ['Oils', 'Spices', 'Condiments'],
    groupsCompleted: 67,
    image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=300&h=200&fit=crop&auto=format',
    verified: true,
    savingsAvg: 25,
  },
];

const CATEGORIES = [
  { label: 'Grains & Rice', icon: '🌾', count: 42 },
  { label: 'Produce', icon: '🥦', count: 67 },
  { label: 'Oils & Fats', icon: '🫙', count: 28 },
  { label: 'Proteins', icon: '🥚', count: 35 },
  { label: 'Pantry', icon: '🫘', count: 54 },
  { label: 'Cleaning', icon: '🧴', count: 19 },
  { label: 'Beverages', icon: '🥤', count: 23 },
  { label: 'Snacks', icon: '🍪', count: 31 },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create or join a group',
    description: 'Start a buying group with neighbors, coworkers, or family. Set a target member count and product.',
    icon: Users,
    color: '#0047AB',
  },
  {
    step: '02',
    title: 'Browse & lock in your deal',
    description: 'Pick from verified vendors. Once your group hits the minimum, the bulk price locks in for everyone.',
    icon: ShoppingCart,
    color: '#0047AB',
  },
  {
    step: '03',
    title: 'Pay securely, receive together',
    description: 'Funds held in escrow until delivery is confirmed. Full transparency — no backdoor deals.',
    icon: Shield,
    color: '#064E3B',
  },
];

function formatPrice(n: number) {
  return `₦${n.toLocaleString()}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export function Welcome({ onGetStarted }: WelcomeProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen bg-[#F4F4F5] overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#0047AB]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0047AB] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span
              className="font-bold text-[#0047AB] text-base tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              SaveTogether
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGetStarted}
              className="text-sm font-medium text-[#0047AB] px-3 py-1.5 rounded-lg hover:bg-[#EBF1FB] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold bg-[#0047AB] text-white px-4 py-1.5 rounded-lg hover:bg-[#003d96] transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-[#0047AB] overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #6EE7B7 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6EE7B7 0%, transparent 50%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-0 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 items-end">
            {/* Left copy */}
            <div className="pb-12 lg:pb-16 space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white/80 text-xs font-medium">
                <Zap className="w-3 h-3 text-[#6EE7B7]" />
                Over 10,000 buyers saving every week
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Save Together,<br />
                <span className="text-[#6EE7B7]">Buy Smarter</span>
              </h1>
              <p className="text-white/75 text-base sm:text-lg max-w-md leading-relaxed">
                Pool your buying power with neighbors, coworkers, and friends.
                Unlock wholesale prices on everyday essentials — no warehouse membership required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={onGetStarted}
                  className="flex items-center justify-center gap-2 bg-[#6EE7B7] text-[#064E3B] font-bold px-6 py-3.5 rounded-xl hover:bg-[#5dd4a4] transition-colors text-sm sm:text-base"
                >
                  Start saving now
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onGetStarted}
                  className="flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white font-medium px-6 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-sm sm:text-base"
                >
                  Browse products
                </button>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {['Escrow-protected payments', 'Verified vendors only', 'Group transparency'].map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 bg-white/10 text-white/70 text-xs px-2.5 py-1 rounded-full"
                  >
                    <Check className="w-3 h-3 text-[#6EE7B7]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right image */}
            <div className="hidden lg:block relative self-end">
              <div className="relative rounded-t-2xl overflow-hidden h-[420px] w-full bg-[#003d96]">
                <img
                  src="https://images.unsplash.com/photo-1601600576337-c1d8a0d1373c?w=700&h=500&fit=crop&auto=format"
                  alt="Abundant market produce on display"
                  className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0047AB] via-transparent to-transparent" />

                {/* Floating stat card */}
                <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#EBF1FB] rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-[#0047AB]" />
                  </div>
                  <div>
                    <div
                      className="text-xl font-extrabold text-[#0047AB]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Up to 40%
                    </div>
                    <div className="text-xs text-gray-500">average savings per order</div>
                  </div>
                </div>

                {/* Active groups badge */}
                <div className="absolute top-6 right-6 bg-[#6EE7B7] text-[#064E3B] rounded-2xl px-3 py-2 text-center shadow-lg">
                  <div
                    className="text-2xl font-extrabold"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    312
                  </div>
                  <div className="text-xs font-medium">active groups</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats ribbon */}
        <div className="relative z-10 bg-white/10 border-t border-white/15 mt-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '10K+', label: 'Active users' },
              { value: '₦2.4B', label: 'Saved to date' },
              { value: '98%', label: 'Satisfaction rate' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  className="text-xl sm:text-2xl font-extrabold text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {value}
                </div>
                <div className="text-white/60 text-xs sm:text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold text-[#0D1117]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Browse by category
          </h2>
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold text-[#0047AB] flex items-center gap-1 hover:gap-2 transition-all"
          >
            All categories <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map(({ label, icon, count }) => (
            <button
              key={label}
              onClick={() => setActiveCategory(activeCategory === label ? null : label)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border text-center transition-all ${
                activeCategory === label
                  ? 'bg-[#0047AB] border-[#0047AB] text-white shadow-md'
                  : 'bg-white border-[#0047AB]/10 text-[#0D1117] hover:border-[#0047AB]/30 hover:shadow-sm'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              <span className={`text-[10px] ${activeCategory === label ? 'text-white/70' : 'text-gray-400'}`}>
                {count} products
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-[#0D1117]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Featured products
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Active group deals — join before they fill up</p>
          </div>
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold text-[#0047AB] flex items-center gap-1 hover:gap-2 transition-all flex-shrink-0"
          >
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal scroll on mobile, 3-col grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {FEATURED_PRODUCTS.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex-shrink-0 w-64 lg:w-auto bg-white rounded-2xl overflow-hidden border border-[#0047AB]/8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              onClick={onGetStarted}
            >
              {/* Image */}
              <div className="relative h-36 bg-[#EBF1FB] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="bg-[#6EE7B7] text-[#064E3B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Save {p.savings}%
                  </span>
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <span className="bg-white/90 text-[#0047AB] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#0047AB]/20">
                    {p.category}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-3.5 space-y-2.5">
                <div>
                  <h3
                    className="font-semibold text-[#0D1117] text-sm leading-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {p.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{p.unit} · {p.vendor}</p>
                </div>

                {/* Pricing */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-lg font-extrabold text-[#0047AB]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {formatPrice(p.groupPrice)}
                  </span>
                  <span className="text-xs text-gray-400 line-through">{formatPrice(p.originalPrice)}</span>
                </div>

                {/* Group stats */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-3 h-3" />
                    <span>{p.groupsActive} active groups</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Package className="w-3 h-3" />
                    <span>Min. {p.minMembers}</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  className="w-full text-xs font-semibold bg-[#0047AB] text-white py-2 rounded-xl hover:bg-[#003d96] transition-colors flex items-center justify-center gap-1.5 group-hover:gap-2.5"
                  onClick={(e) => { e.stopPropagation(); onGetStarted(); }}
                >
                  Join a group
                  <ArrowRight className="w-3 h-3 transition-all" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE PROP STRIP ─────────────────────────────────── */}
      <section className="bg-[#0047AB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: 'Escrow-protected',
              desc: 'Funds only release after you confirm delivery. Zero risk of losing your money.',
            },
            {
              icon: MessageSquare,
              title: 'Full transparency',
              desc: 'All group members can read vendor communications. No backdoor deals, ever.',
            },
            {
              icon: TrendingDown,
              title: 'Guaranteed savings',
              desc: 'Bulk pricing is locked in before payment. What you see is what everyone pays.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#6EE7B7]" />
              </div>
              <div>
                <h3
                  className="font-semibold text-white text-sm"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED VENDORS ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-[#0D1117]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Featured vendors
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Verified suppliers with proven track records</p>
          </div>
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold text-[#0047AB] flex items-center gap-1 hover:gap-2 transition-all flex-shrink-0"
          >
            All vendors <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_VENDORS.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#0047AB]/8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              onClick={onGetStarted}
            >
              {/* Banner image */}
              <div className="relative h-28 bg-[#EBF1FB] overflow-hidden">
                <img
                  src={v.image}
                  alt={`${v.name} market`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {v.verified && (
                  <div className="absolute top-3 right-3 bg-[#6EE7B7] text-[#064E3B] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    Verified
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <div
                    className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-lg font-bold text-[#0047AB]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {v.name[0]}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div>
                  <h3
                    className="font-bold text-[#0D1117] text-sm"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {v.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{v.tagline}</p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <StarRating rating={v.rating} />
                  <span className="text-xs font-semibold text-[#0D1117]">{v.rating}</span>
                  <span className="text-xs text-gray-400">({v.reviews} reviews)</span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {v.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {v.fulfillmentTime}
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1">
                  {v.specialties.map((s) => (
                    <span
                      key={s}
                      className="bg-[#EBF1FB] text-[#0047AB] text-[10px] font-medium px-2 py-0.5 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-center">
                    <div
                      className="text-sm font-bold text-[#0047AB]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {v.groupsCompleted}
                    </div>
                    <div className="text-[10px] text-gray-400">groups done</div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-sm font-bold text-[#064E3B]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {v.savingsAvg}%
                    </div>
                    <div className="text-[10px] text-gray-400">avg savings</div>
                  </div>
                  <button
                    className="text-xs font-semibold bg-[#0047AB] text-white px-3 py-1.5 rounded-lg hover:bg-[#003d96] transition-colors"
                    onClick={(e) => { e.stopPropagation(); onGetStarted(); }}
                  >
                    View deals
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="bg-white border-y border-[#0047AB]/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#0D1117]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              How it works
            </h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              From group formation to doorstep delivery — the whole process is transparent and protected.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center gap-4">
                {/* Connector line (desktop) */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px border-t-2 border-dashed border-[#0047AB]/20" />
                )}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#EBF1FB] flex items-center justify-center">
                    <Icon className="w-7 h-7 text-[#0047AB]" />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#0047AB] text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {step.replace('0', '')}
                  </span>
                </div>
                <div>
                  <h3
                    className="font-bold text-[#0D1117] text-sm mb-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[220px] mx-auto">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="relative bg-[#0047AB] rounded-3xl overflow-hidden px-6 sm:px-12 py-10 text-center">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(circle at 10% 90%, #6EE7B7 0%, transparent 45%), radial-gradient(circle at 90% 10%, #6EE7B7 0%, transparent 45%)',
            }}
          />
          <div className="relative z-10 space-y-4 max-w-lg mx-auto">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Ready to start saving?
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Join thousands of smart buyers already saving up to 40% on their groceries and household essentials.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center gap-2 bg-[#6EE7B7] text-[#064E3B] font-bold px-8 py-3.5 rounded-xl hover:bg-[#5dd4a4] transition-colors"
              >
                Create your group
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-[#0047AB]/10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0047AB] flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="font-bold text-[#0047AB] text-sm"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              SaveTogether
            </span>
          </div>
          <p className="text-xs text-gray-400">
            © 2024 SaveTogether. Secure group buying, powered by escrow.
          </p>
        </div>
      </footer>
    </div>
  );
}
