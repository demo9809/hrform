import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Upload, User, Plus, X } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const TOTAL_STEPS = 9;

interface EducationEntry {
  id: string;
  qualification: string;
  courseSpecialization: string;
  institution: string;
  yearOfCompletion: string;
  certificate: File | null;
}

interface WorkExperienceEntry {
  id: string;
  organization: string;
  designation: string;
  startDate: string;
  endDate: string;
  reasonForLeaving: string;
  experienceLetter: File | null;
  relievingLetter: File | null;
}

export function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    // Section 1: Personal Identity
    fullName: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Indian',
    personalEmail: '',
    mobileNumber: '',
    
    // Section 2: Address
    currentAddress: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    permanentAddress: '',
    sameAsCurrent: false,
    
    // Section 3: Government & Tax
    aadhaarNumber: '',
    panNumber: '',
    passportNumber: '',
    passportExpiry: '',
    
    // Section 4: Bank Details
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    cancelledCheque: null as File | null,
    
    // Section 5: Education (dynamic)
    education: [
      {
        id: Date.now().toString(),
        qualification: '',
        courseSpecialization: '',
        institution: '',
        yearOfCompletion: '',
        certificate: null,
      }
    ] as EducationEntry[],
    
    // Section 6: Work Experience
    isFresher: true,
    workExperience: [] as WorkExperienceEntry[],
    
    // Section 7: Emergency Contact
    emergencyContactName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    
    // Section 8: Photo
    photograph: null as File | null,
    
    // Section 9: Declarations
    declarationTruthful: false,
    consentBackgroundCheck: false,
    agreePolicies: false,
    acceptNDA: false,
    digitalSignature: '',
  });
  
  const [photographPreview, setPhotographPreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Handle "Same as Current Address" checkbox
      if (field === 'sameAsCurrent' && value) {
        newData.permanentAddress = `${prev.currentAddress}, ${prev.city}, ${prev.district}, ${prev.state} - ${prev.pincode}`;
      }
      
      return newData;
    });
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (field === 'photograph' && file) {
      // Validate photo
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG or PNG files are allowed for photographs');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotographPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  // Education handlers
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: Date.now().toString(),
          qualification: '',
          courseSpecialization: '',
          institution: '',
          yearOfCompletion: '',
          certificate: null,
        }
      ]
    }));
  };

  const removeEducation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const updateEducation = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  // Work Experience handlers
  const addWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperience: [
        ...prev.workExperience,
        {
          id: Date.now().toString(),
          organization: '',
          designation: '',
          startDate: '',
          endDate: '',
          reasonForLeaving: '',
          experienceLetter: null,
          relievingLetter: null,
        }
      ]
    }));
  };

  const removeWorkExperience = (id: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.filter(exp => exp.id !== id)
    }));
  };

  const updateWorkExperience = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  // Validation functions
  const validateAadhaar = (aadhaar: string): boolean => {
    const cleaned = aadhaar.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleaned)) {
      toast.error('Aadhaar must be exactly 12 digits');
      return false;
    }
    return true;
  };

  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
      toast.error('Invalid PAN format. Must be: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)');
      return false;
    }
    return true;
  };

  const validateIFSC = (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
      toast.error('Invalid IFSC code format');
      return false;
    }
    return true;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Personal Identity
        if (!formData.fullName || !formData.dateOfBirth || !formData.gender ||
            !formData.nationality || !formData.personalEmail || !formData.mobileNumber) {
          toast.error('Please fill all required fields');
          return false;
        }
        if (formData.personalEmail.toLowerCase().includes('@company.') || 
            formData.personalEmail.toLowerCase().includes('@work.')) {
          toast.error('Please use personal email, not company email');
          return false;
        }
        return true;
      
      case 2: // Address
        if (!formData.currentAddress || !formData.city || !formData.district ||
            !formData.state || !formData.pincode) {
          toast.error('Please fill all address fields');
          return false;
        }
        if (!/^\d{6}$/.test(formData.pincode)) {
          toast.error('Pincode must be 6 digits');
          return false;
        }
        return true;
      
      case 3: // Government & Tax
        if (!formData.aadhaarNumber || !formData.panNumber) {
          toast.error('Aadhaar and PAN are mandatory');
          return false;
        }
        if (!validateAadhaar(formData.aadhaarNumber)) return false;
        if (!validatePAN(formData.panNumber)) return false;
        return true;
      
      case 4: // Bank Details
        if (!formData.accountHolderName || !formData.bankName ||
            !formData.accountNumber || !formData.ifscCode || !formData.cancelledCheque) {
          toast.error('Please fill all bank details and upload cancelled cheque');
          return false;
        }
        if (!validateIFSC(formData.ifscCode)) return false;
        return true;
      
      case 5: // Education
        for (const edu of formData.education) {
          if (!edu.qualification || !edu.courseSpecialization || 
              !edu.institution || !edu.yearOfCompletion) {
            toast.error('Please complete all education entries or remove incomplete ones');
            return false;
          }
        }
        return true;
      
      case 6: // Work Experience
        if (!formData.isFresher && formData.workExperience.length === 0) {
          toast.error('Please add at least one work experience entry');
          return false;
        }
        for (const exp of formData.workExperience) {
          if (!exp.organization || !exp.designation || !exp.startDate || 
              !exp.endDate || !exp.reasonForLeaving) {
            toast.error('Please complete all work experience entries');
            return false;
          }
        }
        return true;
      
      case 7: // Emergency Contact
        if (!formData.emergencyContactName || !formData.emergencyRelationship ||
            !formData.emergencyPhone) {
          toast.error('Please fill all emergency contact details');
          return false;
        }
        return true;
      
      case 8: // Photo
        if (!formData.photograph) {
          toast.error('Please upload your photograph');
          return false;
        }
        return true;
      
      case 9: // Declarations
        if (!formData.declarationTruthful || !formData.consentBackgroundCheck ||
            !formData.agreePolicies || !formData.acceptNDA) {
          toast.error('Please accept all declarations');
          return false;
        }
        if (!formData.digitalSignature || formData.digitalSignature.trim() !== formData.fullName.trim()) {
          toast.error('Digital signature must match your full legal name exactly');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(TOTAL_STEPS)) return;

    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      
      // Add all simple fields
      const simpleFields = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        nationality: formData.nationality,
        personalEmail: formData.personalEmail,
        mobileNumber: formData.mobileNumber,
        currentAddress: formData.currentAddress,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
        permanentAddress: formData.permanentAddress || formData.currentAddress,
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        passportNumber: formData.passportNumber,
        passportExpiry: formData.passportExpiry,
        accountHolderName: formData.accountHolderName,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        isFresher: formData.isFresher,
        emergencyContactName: formData.emergencyContactName,
        emergencyRelationship: formData.emergencyRelationship,
        emergencyPhone: formData.emergencyPhone,
        digitalSignature: formData.digitalSignature,
      };
      
      Object.entries(simpleFields).forEach(([key, value]) => {
        submitFormData.append(key, String(value));
      });
      
      // Add education as JSON
      submitFormData.append('education', JSON.stringify(
        formData.education.map(({ id, certificate, ...rest }) => rest)
      ));
      
      // Add work experience as JSON
      submitFormData.append('workExperience', JSON.stringify(
        formData.workExperience.map(({ id, experienceLetter, relievingLetter, ...rest }) => rest)
      ));
      
      // Add files
      if (formData.photograph) submitFormData.append('photograph', formData.photograph);
      if (formData.cancelledCheque) submitFormData.append('cancelledCheque', formData.cancelledCheque);
      
      // Add education certificates
      formData.education.forEach((edu, index) => {
        if (edu.certificate) {
          submitFormData.append(`educationCertificate_${index}`, edu.certificate);
        }
      });
      
      // Add experience letters
      formData.workExperience.forEach((exp, index) => {
        if (exp.experienceLetter) {
          submitFormData.append(`experienceLetter_${index}`, exp.experienceLetter);
        }
        if (exp.relievingLetter) {
          submitFormData.append(`relievingLetter_${index}`, exp.relievingLetter);
        }
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0e23869b/employees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: submitFormData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      toast.success('Onboarding completed successfully!');
      toast.success(`Your Employee ID: ${data.employeeId}`, { duration: 5000 });
      
      // Reset form after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Employee Onboarding Form</h1>
          <p className="text-gray-600">Please provide accurate information as per official documents</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(step => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${
                    step < currentStep
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : step === currentStep
                      ? 'bg-white border-teal-600 text-teal-600'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < TOTAL_STEPS && (
                  <div
                    className={`flex-1 h-1 mx-1 transition-colors ${
                      step < currentStep ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {currentStep === 1 && (
            <Step1PersonalIdentity formData={formData} onChange={handleInputChange} />
          )}

          {currentStep === 2 && (
            <Step2Address formData={formData} onChange={handleInputChange} />
          )}

          {currentStep === 3 && (
            <Step3GovernmentTax formData={formData} onChange={handleInputChange} />
          )}

          {currentStep === 4 && (
            <Step4BankDetails formData={formData} onChange={handleInputChange} onFileChange={handleFileChange} />
          )}

          {currentStep === 5 && (
            <Step5Education
              education={formData.education}
              onAdd={addEducation}
              onRemove={removeEducation}
              onUpdate={updateEducation}
            />
          )}

          {currentStep === 6 && (
            <Step6WorkExperience
              isFresher={formData.isFresher}
              workExperience={formData.workExperience}
              onToggleFresher={(value) => handleInputChange('isFresher', value)}
              onAdd={addWorkExperience}
              onRemove={removeWorkExperience}
              onUpdate={updateWorkExperience}
            />
          )}

          {currentStep === 7 && (
            <Step7EmergencyContact formData={formData} onChange={handleInputChange} />
          )}

          {currentStep === 8 && (
            <Step8Photograph
              photograph={formData.photograph}
              preview={photographPreview}
              onFileChange={handleFileChange}
            />
          )}

          {currentStep === 9 && (
            <Step9Declarations formData={formData} onChange={handleInputChange} />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Personal Identity Details
function Step1PersonalIdentity({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Personal Identity Details</h2>
        <p className="text-sm text-gray-600">Legal name only. One email only. No company email here.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Full Legal Name (as per Government ID) *</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="Full legal name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => onChange('dateOfBirth', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Gender *</label>
            <select
              value={formData.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Nationality *</label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => onChange('nationality', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Personal Email Address *</label>
          <input
            type="email"
            value={formData.personalEmail}
            onChange={(e) => onChange('personalEmail', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="your.personal@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">Personal email only - no company email</p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Mobile Number with Country Code *</label>
          <input
            type="tel"
            value={formData.mobileNumber}
            onChange={(e) => onChange('mobileNumber', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Address Details
function Step2Address({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Address Details</h2>
        <p className="text-sm text-gray-600">Keep this simple. Most employees are local.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Current Residential Address *</label>
          <textarea
            value={formData.currentAddress}
            onChange={(e) => onChange('currentAddress', e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            placeholder="House/Flat No., Street, Area"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">City *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">District *</label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => onChange('district', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">State *</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => onChange('state', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Pincode *</label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => onChange('pincode', e.target.value)}
              maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="6 digits"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.sameAsCurrent}
            onChange={(e) => onChange('sameAsCurrent', e.target.checked)}
            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label className="text-sm text-gray-700">Permanent address same as current address</label>
        </div>

        {!formData.sameAsCurrent && (
          <div>
            <label className="block text-sm text-gray-700 mb-2">Permanent Address (if different)</label>
            <textarea
              value={formData.permanentAddress}
              onChange={(e) => onChange('permanentAddress', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
              placeholder="Full permanent address"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Government and Tax Details
function Step3GovernmentTax({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Government and Tax Details</h2>
        <p className="text-sm text-gray-600">Reject incorrect entries. Do not "fix" them manually.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Aadhaar Number *</label>
          <input
            type="text"
            value={formData.aadhaarNumber}
            onChange={(e) => onChange('aadhaarNumber', e.target.value.replace(/\D/g, ''))}
            maxLength={12}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="12 digit Aadhaar number"
          />
          <p className="text-xs text-gray-500 mt-1">Exactly 12 digits</p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">PAN Number *</label>
          <input
            type="text"
            value={formData.panNumber}
            onChange={(e) => onChange('panNumber', e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none uppercase"
            placeholder="ABCDE1234F"
          />
          <p className="text-xs text-gray-500 mt-1">Format: 5 letters, 4 digits, 1 letter</p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Optional passport details:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Passport Number (Optional)</label>
              <input
                type="text"
                value={formData.passportNumber}
                onChange={(e) => onChange('passportNumber', e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none uppercase"
                placeholder="A1234567"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Passport Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.passportExpiry}
                onChange={(e) => onChange('passportExpiry', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Bank Details for Salary
function Step4BankDetails({ formData, onChange, onFileChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Bank Details for Salary</h2>
        <p className="text-sm text-gray-600">Account holder name must match PAN name.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Bank Account Holder Name *</label>
          <input
            type="text"
            value={formData.accountHolderName}
            onChange={(e) => onChange('accountHolderName', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="As per bank records"
          />
          <p className="text-xs text-gray-500 mt-1">Must match PAN name exactly</p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Bank Name *</label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => onChange('bankName', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="e.g., State Bank of India"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Account Number *</label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => onChange('accountNumber', e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Account number"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">IFSC Code *</label>
            <input
              type="text"
              value={formData.ifscCode}
              onChange={(e) => onChange('ifscCode', e.target.value.toUpperCase())}
              maxLength={11}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none uppercase"
              placeholder="SBIN0001234"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Upload Cancelled Cheque or Bank Passbook Front Page *</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => onFileChange('cancelledCheque', e.target.files?.[0] || null)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
          {formData.cancelledCheque && (
            <p className="text-sm text-gray-600 mt-2">✓ {formData.cancelledCheque.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 5: Education Details (Repeatable)
function Step5Education({ education, onAdd, onRemove, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Education Details</h2>
        <p className="text-sm text-gray-600">Add all your educational qualifications. Do not limit the count.</p>
      </div>

      {education.map((edu: EducationEntry, index: number) => (
        <div key={edu.id} className="p-6 border-2 border-gray-200 rounded-lg space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Education Entry #{index + 1}</h3>
            {education.length > 1 && (
              <button
                onClick={() => onRemove(edu.id)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Qualification *</label>
              <select
                value={edu.qualification}
                onChange={(e) => onUpdate(edu.id, 'qualification', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="">Select Qualification</option>
                <option value="10th">10th Standard</option>
                <option value="12th">12th Standard</option>
                <option value="Diploma">Diploma</option>
                <option value="Bachelor's">Bachelor's Degree</option>
                <option value="Master's">Master's Degree</option>
                <option value="PhD">PhD/Doctorate</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Course or Specialization *</label>
              <input
                type="text"
                value={edu.courseSpecialization}
                onChange={(e) => onUpdate(edu.id, 'courseSpecialization', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="e.g., Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Institution Name *</label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => onUpdate(edu.id, 'institution', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="University/College name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Year of Completion *</label>
              <input
                type="number"
                value={edu.yearOfCompletion}
                onChange={(e) => onUpdate(edu.id, 'yearOfCompletion', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="YYYY"
                min="1950"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Degree or Course Certificate (Optional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUpdate(edu.id, 'certificate', e.target.files?.[0] || null)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            {edu.certificate && (
              <p className="text-sm text-gray-600 mt-2">✓ {edu.certificate.name}</p>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Another Education
      </button>
    </div>
  );
}

// Step 6: Previous Work Experience (Repeatable & Conditional)
function Step6WorkExperience({ isFresher, workExperience, onToggleFresher, onAdd, onRemove, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Previous Work Experience</h2>
        <p className="text-sm text-gray-600">Conditional. Do not force documents. Collect them gradually if needed.</p>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={isFresher}
            onChange={() => onToggleFresher(true)}
            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">I am a fresher</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!isFresher}
            onChange={() => onToggleFresher(false)}
            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">I have work experience</span>
        </label>
      </div>

      {!isFresher && (
        <>
          {workExperience.map((exp: WorkExperienceEntry, index: number) => (
            <div key={exp.id} className="p-6 border-2 border-gray-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Employer #{index + 1}</h3>
                {workExperience.length > 1 && (
                  <button
                    onClick={() => onRemove(exp.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Organization Name *</label>
                  <input
                    type="text"
                    value={exp.organization}
                    onChange={(e) => onUpdate(exp.id, 'organization', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Designation *</label>
                  <input
                    type="text"
                    value={exp.designation}
                    onChange={(e) => onUpdate(exp.id, 'designation', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="Your role"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Employment Start Date *</label>
                  <input
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => onUpdate(exp.id, 'startDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Employment End Date *</label>
                  <input
                    type="date"
                    value={exp.endDate}
                    onChange={(e) => onUpdate(exp.id, 'endDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Reason for Leaving *</label>
                <textarea
                  value={exp.reasonForLeaving}
                  onChange={(e) => onUpdate(exp.id, 'reasonForLeaving', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  placeholder="Brief reason"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Experience Letter (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => onUpdate(exp.id, 'experienceLetter', e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                  {exp.experienceLetter && (
                    <p className="text-sm text-gray-600 mt-2">✓ {exp.experienceLetter.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Relieving Letter (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => onUpdate(exp.id, 'relievingLetter', e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                  {exp.relievingLetter && (
                    <p className="text-sm text-gray-600 mt-2">✓ {exp.relievingLetter.name}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Previous Employer
          </button>
        </>
      )}
    </div>
  );
}

// Step 7: Emergency Contact
function Step7EmergencyContact({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Emergency Contact</h2>
        <p className="text-sm text-gray-600">Only one contact. Anything more is noise.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Emergency Contact Name *</label>
          <input
            type="text"
            value={formData.emergencyContactName}
            onChange={(e) => onChange('emergencyContactName', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="Full name"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Relationship *</label>
          <select
            value={formData.emergencyRelationship}
            onChange={(e) => onChange('emergencyRelationship', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          >
            <option value="">Select Relationship</option>
            <option value="Parent">Parent</option>
            <option value="Spouse">Spouse</option>
            <option value="Sibling">Sibling</option>
            <option value="Friend">Friend</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Phone Number *</label>
          <input
            type="tel"
            value={formData.emergencyPhone}
            onChange={(e) => onChange('emergencyPhone', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
      </div>
    </div>
  );
}

// Step 8: Photograph
function Step8Photograph({ photograph, preview, onFileChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Photo for ID and Internal Records</h2>
        <p className="text-sm text-gray-600">Auto reject bad uploads.</p>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center mb-4">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <User className="w-20 h-20 text-gray-400" />
          )}
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={(e) => onFileChange('photograph', e.target.files?.[0] || null)}
            className="hidden"
          />
          <span className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            Upload Recent Photograph
          </span>
        </label>

        {photograph && (
          <p className="text-sm text-green-600 mt-2">✓ {photograph.name}</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-900 mb-2">Photo Requirements:</p>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Plain background (white or light color)</li>
          <li>Clear face, front-facing</li>
          <li>No filters or edits</li>
          <li>JPG or PNG format only</li>
          <li>Maximum file size: 5MB</li>
        </ul>
      </div>
    </div>
  );
}

// Step 9: Declarations and Consent
function Step9Declarations({ formData, onChange }: any) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl text-gray-900 mb-2">Declarations and Consent</h2>
        <p className="text-sm text-gray-600">Submission blocked unless all are checked.</p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={formData.declarationTruthful}
            onChange={(e) => onChange('declarationTruthful', e.target.checked)}
            className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I declare that all information provided is <strong>true and accurate</strong> to the best of my knowledge.
          </span>
        </label>

        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={formData.consentBackgroundCheck}
            onChange={(e) => onChange('consentBackgroundCheck', e.target.checked)}
            className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I consent to <strong>background verification</strong> and reference checks by the company.
          </span>
        </label>

        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={formData.agreePolicies}
            onChange={(e) => onChange('agreePolicies', e.target.checked)}
            className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I agree to abide by the <strong>company policies</strong> and code of conduct.
          </span>
        </label>

        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={formData.acceptNDA}
            onChange={(e) => onChange('acceptNDA', e.target.checked)}
            className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I accept the <strong>NDA and confidentiality terms</strong> of employment.
          </span>
        </label>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-gray-900 mb-4">Digital Signature</h3>
        
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Type Your Full Legal Name (Must Match Above) *
          </label>
          <input
            type="text"
            value={formData.digitalSignature}
            onChange={(e) => onChange('digitalSignature', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none font-serif text-lg"
            placeholder="Full legal name as signature"
          />
          <p className="text-xs text-gray-500 mt-1">This serves as your digital signature</p>
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-2">Date</label>
          <input
            type="text"
            value={currentDate}
            disabled
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          ⚠️ <strong>Important:</strong> By submitting this form, you are digitally signing this document.
          Ensure all information is correct before submission.
        </p>
      </div>
    </div>
  );
}
