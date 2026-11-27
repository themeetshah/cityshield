import { Link } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import {
    ArrowRight,
    BadgeCheck,
    Camera,
    CheckCircle2,
    Clock,
    Users,
    Flame,
    HandHeart,
    HeartPulse,
    Hospital,
    MapPin,
    Navigation,
    Shield,
    ShieldCheck,
    Siren,
    Wrench,
} from 'lucide-react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';

// Content describes what the product actually does - no invented numbers, quotes or claims.

const DEPARTMENTS = [
    { icon: Shield, name: 'Police', handles: 'Crime, harassment, safety', tone: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { icon: Wrench, name: 'Municipal', handles: 'Roads, lights, infrastructure', tone: 'bg-amber-50 text-amber-600 ring-amber-100' },
    { icon: Flame, name: 'Fire & Rescue', handles: 'Fire hazards', tone: 'bg-orange-50 text-orange-600 ring-orange-100' },
    { icon: HeartPulse, name: 'Medical / EMS', handles: 'Medical issues', tone: 'bg-rose-50 text-rose-600 ring-rose-100' },
];

const SOS_STEPS = [
    { icon: Siren, label: 'Tap SOS', text: 'You have 5 seconds to cancel if it was a mistake.' },
    { icon: MapPin, label: 'Location is shared', text: 'Live GPS is tracked for the whole emergency.' },
    { icon: Camera, label: 'Evidence is recorded', text: '10-second camera/microphone segments upload in the background.' },
    { icon: HandHeart, label: 'Help is notified', text: 'Nearby verified volunteers and the responsible department.' },
];

const ROLES = [
    {
        icon: Users,
        title: 'Citizens',
        text: 'Report incidents, raise an SOS, follow report status and read official alerts.',
        tag: 'Self sign-up',
        accent: 'bg-blue-50 text-blue-600',
    },
    {
        icon: HandHeart,
        title: 'Volunteers',
        text: 'Apply from your profile. Once the police approve you, you can respond to nearby SOS alerts.',
        tag: 'Approved by police',
        accent: 'bg-amber-50 text-amber-600',
    },
    {
        icon: Shield,
        title: 'Department staff',
        text: 'Police, municipal, fire and medical teams work the SOS and reports for their department.',
        tag: 'Added by admins',
        accent: 'bg-emerald-50 text-emerald-600',
    },
    {
        icon: BadgeCheck,
        title: 'Administrators',
        text: 'Department admins manage their own staff and data. Super admins oversee the whole platform.',
        tag: 'Restricted accounts',
        accent: 'bg-violet-50 text-violet-600',
    },
];

const STEPS = [
    { title: 'Create a free account', text: 'Sign up with your email address or Google account.' },
    { title: 'Report what you see', text: 'Describe the issue, pin it on the map and add photos if you have them.' },
    { title: 'Track the response', text: 'Follow the status of your reports and get notified about updates.' },
];

const Reveal = ({ children, delay = 0, className = '' }) => {
    const reduce = useReducedMotion();
    return (
        <Motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay, ease: 'easeOut' }}
        >
            {children}
        </Motion.div>
    );
};

const SectionHeading = ({ eyebrow, title, id, children }) => (
    <div className="max-w-2xl mx-auto text-center mb-14">
        <p className="text-sm font-bold tracking-widest uppercase mb-3 text-blue-600">{eyebrow}</p>
        <h2 id={id} className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            {title}
        </h2>
        {children && <p className="mt-4 text-lg text-slate-600">{children}</p>}
    </div>
);

// Text half of an alternating showcase row.
const ShowcaseText = ({ eyebrow, title, children, icon: Icon, accent }) => (
    <div className="text-center lg:text-left">
        <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${accent}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
            {eyebrow}
        </span>
        <h3 className="mt-5 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{title}</h3>
        <div className="mt-4 text-lg leading-relaxed text-slate-600 space-y-4">{children}</div>
    </div>
);

const Card = ({ className = '', children }) => (
    <div className={`rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-xl shadow-slate-900/5 ${className}`}>{children}</div>
);

// Hero illustration: a composition of illustrative UI cards (no real data).
const HeroVisual = () => {
    const reduce = useReducedMotion();
    const float = (d) =>
        reduce ? undefined : { y: [0, -8, 0], transition: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: d } };
    return (
        <div className="relative mx-auto w-full max-w-lg sm:h-[500px]" aria-hidden="true">
            <div className="absolute inset-x-4 inset-y-6 rounded-[2.5rem] bg-gradient-to-br from-blue-100 via-sky-50 to-teal-100" />

            {/* map card */}
            <Motion.div animate={float(0)} className="relative sm:absolute sm:top-0 sm:left-0 sm:right-10">
                <Card className="p-3">
                    <div className="relative h-52 sm:h-56 overflow-hidden rounded-2xl bg-sky-50">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage:
                                    'linear-gradient(rgba(14,116,144,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,.10) 1px, transparent 1px)',
                                backgroundSize: '32px 32px',
                            }}
                        />
                        <div className="absolute -left-6 top-24 h-8 w-[130%] -rotate-12 bg-white/90" />
                        <div className="absolute left-24 -top-6 h-[130%] w-7 rotate-12 bg-white/90" />
                        <div className="absolute top-8 right-14 h-24 w-24 rounded-full bg-red-400/25 blur-xl" />
                        <span className="absolute top-14 right-20 h-3.5 w-3.5 rounded-full bg-red-500 ring-4 ring-red-500/25" />
                        <span className="absolute bottom-10 left-12 h-3.5 w-3.5 rounded-full bg-amber-400 ring-4 ring-amber-400/30" />
                        <span className="absolute bottom-16 right-28 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow">
                            <Hospital className="w-4 h-4" />
                        </span>
                        <span className="absolute top-20 left-40 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-600/25">
                            <Navigation className="w-4 h-4 text-white" />
                        </span>
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                            Safety map
                        </span>
                    </div>
                </Card>
            </Motion.div>

            {/* On small screens the report and SOS cards sit side by side below the map. */}
            <div className="relative mt-4 grid grid-cols-5 gap-4 sm:contents">
            {/* report status card */}
            <Motion.div animate={float(1.2)} className="relative col-span-3 sm:absolute sm:bottom-6 sm:left-0 sm:w-64">
                <Card className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your report</p>
                    <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                <Shield className="w-4 h-4" />
                            </span>
                            <span className="text-sm font-semibold text-slate-800">Sent to Police</span>
                            <CheckCircle2 className="ml-auto w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                                <Clock className="w-4 h-4" />
                            </span>
                            <span className="text-sm font-semibold text-slate-800">Under review</span>
                            <span className="ml-auto h-2.5 w-2.5 rounded-full bg-amber-400" />
                        </div>
                    </div>
                </Card>
            </Motion.div>

            {/* SOS card */}
            <Motion.div animate={float(2.4)} className="relative col-span-2 sm:absolute sm:bottom-0 sm:right-0 sm:w-48">
                <Card className="flex h-full flex-col items-center justify-center p-4 sm:p-5">
                    <span className="relative flex h-20 w-20 items-center justify-center">
                        <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" />
                        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-lg font-black text-white shadow-lg shadow-red-500/40">
                            SOS
                        </span>
                    </span>
                    <span className="mt-3 text-center text-xs font-semibold text-slate-500">Tap to alert responders</span>
                </Card>
            </Motion.div>
            </div>
        </div>
    );
};

const LandingPage = () => (
    <>
        <Navbar />
        <main className="bg-white text-slate-900">
            {/* Hero */}
            <section className="relative isolate overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
                <div
                    className="absolute inset-0 -z-10 opacity-60"
                    aria-hidden="true"
                    style={{
                        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                        backgroundSize: '26px 26px',
                        maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                    }}
                />
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-2 gap-14 items-center">
                    <Motion.div
                        className="text-center lg:text-left"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        {/* <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 shadow-sm">
                            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                            Citizens, volunteers and city departments, connected
                        </span> */}
                        <h1 className="mt-6 text-5xl sm:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-slate-900">
                            Your safety.
                            <br />
                            Your city.
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-teal-500 bg-clip-text text-transparent">
                                Your voice.
                            </span>
                        </h1>
                        <p className="mx-auto lg:mx-0 mt-6 max-w-xl text-lg sm:text-xl leading-relaxed text-slate-600">
                            Report issues, call for emergency help in one tap, and work with police, municipal, fire and
                            medical teams to build a safer community.
                        </p>
                        <div className="mt-9 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            <Link
                                to="/register"
                                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-lg font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                            >
                                Create a free account
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-lg font-bold text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                            >
                                Sign in
                            </Link>
                        </div>
                        <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Free to join
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" /> SOS works without an account
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Anonymous reporting
                            </li>
                        </ul>
                    </Motion.div>

                    <Motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
                    >
                        <HeroVisual />
                    </Motion.div>
                </div>
            </section>

            {/* Showcase rows */}
            <section aria-labelledby="features-title" className="py-12 sm:py-16 bg-white">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading eyebrow="What CityShield does" id="features-title" title="Built for everyday issues and real emergencies" />

                    <div className="space-y-12 sm:space-y-16">
                        {/* SOS */}
                        <Reveal>
                            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                                <ShowcaseText icon={Siren} eyebrow="One-tap SOS" accent="bg-red-50 text-red-600" title="Help starts with a single tap">
                                    <p>
                                        The SOS button works even if you are not signed in. Nearby verified volunteers and the
                                        responsible department are notified automatically.
                                    </p>
                                    <p className="text-base text-slate-500">
                                        Video and audio are recorded segments uploaded in the background, not a live stream.
                                    </p>
                                </ShowcaseText>
                                <Card className="p-6 sm:p-8 bg-gradient-to-br from-white to-red-50/60">
                                    <ol className="relative space-y-6">
                                        <span className="absolute left-5 top-5 bottom-5 w-px bg-red-100" aria-hidden="true" />
                                        {SOS_STEPS.map(({ icon: Icon, label, text }) => (
                                            <li key={label} className="relative flex gap-4">
                                                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-4 ring-white">
                                                    <Icon className="w-5 h-5" aria-hidden="true" />
                                                </span>
                                                <div>
                                                    <p className="font-bold text-slate-900">{label}</p>
                                                    <p className="text-sm leading-relaxed text-slate-600">{text}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </Card>
                            </div>
                        </Reveal>

                        {/* Reports + routing */}
                        <Reveal>
                            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                                <Card className="order-last lg:order-first p-6 sm:p-8 bg-gradient-to-br from-white to-blue-50/60">
                                    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                                        <span className="p-2.5 rounded-xl bg-blue-600 text-white">
                                            <MapPin className="w-5 h-5" aria-hidden="true" />
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-900">New report</p>
                                            <p className="text-xs text-slate-500">Location, photos or video, optional anonymity</p>
                                        </div>
                                    </div>
                                    <div className="mx-auto h-6 w-px bg-slate-300" aria-hidden="true" />
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {DEPARTMENTS.map(({ icon: Icon, name, handles, tone }) => (
                                            <li key={name} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                                                <span className={`p-2.5 rounded-xl ring-1 ${tone}`}>
                                                    <Icon className="w-5 h-5" aria-hidden="true" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-tight">{name}</p>
                                                    <p className="text-xs text-slate-500">{handles}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                                <ShowcaseText
                                    icon={ShieldCheck}
                                    eyebrow="Report and route"
                                    accent="bg-blue-50 text-blue-600"
                                    title="Every report reaches the right team"
                                >
                                    <p>
                                        Report crime, harassment, fire hazards, medical issues or broken infrastructure. Each
                                        report is sent to the department responsible.
                                    </p>
                                    <p>You are notified whenever its status changes.</p>
                                </ShowcaseText>
                            </div>
                        </Reveal>

                        {/* Map */}
                        <Reveal>
                            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                                <ShowcaseText
                                    icon={Navigation}
                                    eyebrow="Safety map"
                                    accent="bg-emerald-50 text-emerald-600"
                                    title="Know what is around you"
                                >
                                    <p>
                                        See reported incidents near you, plus police stations and hospitals from OpenStreetMap, an
                                        incident-density risk layer and directions to the nearest safe place.
                                    </p>
                                </ShowcaseText>
                                <Card className="p-3">
                                    <div className="relative h-72 overflow-hidden rounded-2xl bg-emerald-50/70" aria-hidden="true">
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(rgba(5,150,105,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,.10) 1px, transparent 1px)',
                                                backgroundSize: '34px 34px',
                                            }}
                                        />
                                        <div className="absolute -left-10 top-28 h-9 w-[140%] -rotate-6 bg-white/90" />
                                        <div className="absolute left-1/3 -top-10 h-[140%] w-8 rotate-6 bg-white/90" />
                                        <div className="absolute right-16 top-10 h-32 w-32 rounded-full bg-red-400/20 blur-2xl" />
                                        <div className="absolute left-10 bottom-8 h-24 w-24 rounded-full bg-amber-300/30 blur-2xl" />
                                        <svg className="absolute inset-0 h-full w-full" fill="none">
                                            <path d="M110 220 C 170 190, 190 150, 270 130" stroke="#2563eb" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
                                        </svg>
                                        <span className="absolute left-24 top-[13.4rem] flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-600/25">
                                            <Navigation className="w-4 h-4 text-white" />
                                        </span>
                                        <span className="absolute left-60 top-24 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-md">
                                            <Shield className="w-5 h-5" />
                                        </span>
                                        <span className="absolute right-10 bottom-12 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 shadow-md">
                                            <Hospital className="w-5 h-5" />
                                        </span>
                                        <span className="absolute right-24 top-14 h-3.5 w-3.5 rounded-full bg-red-500 ring-4 ring-red-500/25" />
                                        <span className="absolute left-14 bottom-14 h-3.5 w-3.5 rounded-full bg-amber-400 ring-4 ring-amber-400/30" />
                                    </div>
                                </Card>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section aria-labelledby="roles-title" className="py-12 sm:py-16 bg-white">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading eyebrow="Who it is for" id="roles-title" title="One platform, everyone who keeps a city safe">
                        Each role sees only what it needs, and access is enforced by the server.
                    </SectionHeading>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {ROLES.map(({ icon: Icon, title, text, tag, accent }, i) => (
                            <li key={title}>
                                <Reveal delay={i * 0.08} className="h-full">
                                    <div className="flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                                        <span className={`inline-flex w-fit p-3 rounded-2xl ${accent}`}>
                                            <Icon className="w-6 h-6" aria-hidden="true" />
                                        </span>
                                        <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                                        <p className="mt-2 flex-1 leading-relaxed text-slate-600">{text}</p>
                                        <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                                            {tag}
                                        </span>
                                    </div>
                                </Reveal>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* How it works */}
            <section aria-labelledby="how-title" className="py-12 sm:py-16 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                    <SectionHeading eyebrow="Getting started" id="how-title" title="Up and running in three steps" />
                    <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div
                            className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-gradient-to-r from-blue-200 via-teal-300 to-blue-200"
                            aria-hidden="true"
                        />
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="relative text-center">
                                <Reveal delay={i * 0.1}>
                                    <span
                                        className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-xl font-black text-white shadow-lg shadow-blue-500/30"
                                        aria-hidden="true"
                                    >
                                        {i + 1}
                                    </span>
                                    <h3 className="mt-5 text-xl font-bold text-slate-900">{step.title}</h3>
                                    <p className="mt-2 text-slate-600 leading-relaxed">{step.text}</p>
                                </Reveal>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </main>
        <Footer />
    </>
);

export default LandingPage;
