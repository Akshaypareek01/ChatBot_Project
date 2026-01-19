import React from 'react';

const Industries = () => {
    const industries = [
        { title: "E-commerce", subtitle: "Retail & Direct", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWLPHDvT9z4U68iwmoH-wNg2r-WTKqUrR5Xlg0phFWVNGoV8j-RmFHzWTq3cFcynBefazgpelMMUD47yHHB_0-k84HoazUw-jmjqm12uJwIiC3NckHCUPjFRFnMqj4UfOfI_ma2iX7dLfbOcIg0FjTnnj_-ZNWCYShwKAQRJB2QydP_UuvhNJmHyx_fmST5-DImMxXaodtjkw0CjMD7C191JDvAgUrARVxyX9ZugmCGXfy5GqJliL4Gq7auMqdWkbYhORv-5rXtsMm" },
        { title: "EdTech", subtitle: "Courses & Support", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzgjTjFjoH9Uq67o7Ci30BdvJDyzPSChWSEtQAdWpIetu_datsuAemCgvKm3fJ_PaSTXaYW70kzX3ojEDSmz5qN_s-Y4LeB2HqWA6aUZMiiFlUi_HTQzt9v3Engk0UlIBrrnJ6AIOBZZA82brJDGgfPYKur9HTkbf6fPKPN5sXag0LAoceKqzg8oBdl1Z9S-UrgP_H6RDMFEJFVlMbSlTlGvxXprzE_XT70iG3821zR7Ev2_hBk_7B1R5d4OUlS2mb8Mn0B35yQ4Ju" },
        { title: "B2B SaaS", subtitle: "Onboarding & Help", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSW4rEoJcR72JnflQk8Ne9PaIgRRf-VZ57CTtvfLLxStOKl91NKN0mo_PhkJNzEU88aPAOlYT9aLq8RTRKX55AvxMB1frERfe3EA0zSZfo2jMdlLhar4HFwWQwJqwFToz_gzg7ZIcB456BOvzOqyCxdZLqcXXZiD9LmQZT4SU1XUptfN1bKUl0whWz2lcGgOsctBCckB8OSd-ngpFtMBmVCODqYwohTqwPC94_AOd5ySCBPfhEoPdF2iJz_u_iXABj5vSdWPflmTqf" },
        { title: "Agencies", subtitle: "Client Service", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuChYH3I75o7PEaORhUL9ZsKSNJvTlAjZHkT8dbx9ZZQefIzApoESJg5Lb8pX_R_to8cHDAaAdJhfyyCsQGsJGWiXnSrU503sNdrsIOSQhOKRJltl_8FGgQg21j5w9L61_i7QFWlILOI-VacKd9dKAIdv4xll6ABKkLUtPDcYLomsw2NonN7GxwHvH2ltjEFc51_kmehfsAbJ-QuxajuEbKZM7ilKen6vCcSEWmPzShGw7dK08_doJ3vsp2GJmee9Z0k60BPjMPuKzJu" }
    ];

    return (
        <section className="py-32 bg-[#F9FAFB]">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20">
                <h3 className="text-2xl font-bold mb-16 flex items-center gap-4 tracking-tight">
                    <span className="w-12 h-[1px] bg-slate-300"></span>
                    Specialized for Your Industry
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {industries.map((item, i) => (
                        <div key={i} className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-200 shadow-lg">
                            <img alt={item.title} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" src={item.img} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-8">
                                <span className="text-white font-bold text-xl mb-1">{item.title}</span>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{item.subtitle}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Industries;
