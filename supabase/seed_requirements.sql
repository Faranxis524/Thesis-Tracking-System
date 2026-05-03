-- PNC requirements seed (from your provided list)

insert into public.requirements (stage, timing, owner, code, name, is_optional)
values

-- 1 — TITLE APPROVAL
('title','before','student','PNC:PRE-FO-64/65','Student Research Grouping Form',false),
('title','before','student','PNC:PRE-FO-66','Proposed Student Research Topics',false),

('title','before','teacher','PNC:PRE-FO-59','Research Adviser Application Form',false),
('title','before','teacher','PNC:PRE-FO-67','Research Title Assessment Form',false),
('title','before','teacher','PNC:PRE-FO-69','Summary of Student Research',false),

('title','after','student','PNC:PRE-FO-61','Thesis Advising and Commitment Form',false),

-- 2 — PROPOSAL DEFENSE
('proposal','before','student',null,'Soft copy of completed research proposal',false),
('proposal','before','student',null,'Official Receipt of Proposal Defense Fee',false),

('proposal','before','student','PNC:PRE-FO-71','Recommendation Form',false),
('proposal','before','student','PNC:PRE-FO-68','Notarized University''s Confidentiality and NDA for Research',false),

('proposal','before','teacher','PNC:PRE-FO-72','Panel Comment Sheet',false),
('proposal','before','teacher','PNC:PRE-FO-73','Proposal Defense Evaluation Form',false),

('proposal','after','student','PNC:PRE-FO-49','Research Ethics Application Form',false),
('proposal','after','student','PNC:PRE-FO-50','Informed Consent Form',false),
('proposal','after','student','PNC:PRE-FO-51','Parental Consent Form for Research Undertaking',true),
('proposal','after','student','PNC:PRE-FO-89','Research Instrument Validation Form',false),
('proposal','after','student','PNC:PRE-FO-70','Student Research Title Changing Form',true),
('proposal','after','student','PNC:PRE-FO-62','Adviser/Statistician/Analysts Changing Form',true),
('proposal','after','student','PNC:PRE-FO-49','Approval Sheet',false),
('proposal','after','student',null,'Revised Manuscript',false),
('proposal','after','student','PNC:PRE-FO-107','Declaration of Generative AI and AI-assisted Technologies in the Writing Process',false),

-- 3 — FINAL DEFENSE
('final','before','student',null,'Soft copy of completed final paper',false),
('final','before','student',null,'Official Receipt of Final Defense Fee',false),
('final','before','student','PNC:PRE-FO-71','Recommendation Form',false),
('final','before','student','PNC:PRE-FO-68','Notarized University''s Confidentiality and NDA for Research',false),
('final','before','student','PNC:PRE-FO-52','Research Ethics Review Committee Evaluation',false),
('final','before','student','PNC:PRE-FO-95','Management of RERC Post-Approval Submissions',false),

('final','before','teacher','PNC:PRE-FO-72','Panel Comment Sheet',false),
('final','before','teacher','PNC:PRE-FO-74','Final Defense Evaluation Form',false),

('final','after','student',null,'Revised Manuscript',false),
('final','after','student','PNC:PRE-FO-49','Approval Sheet',false),
('final','after','student','PNC:PRE-FO-81','Research Adviser/Analyst Consultation Form',false),
('final','after','student','PNC:PRE-FO-107','Declaration of Generative AI and AI-assisted Technologies in the Writing Process',false)
;
