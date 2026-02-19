#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class IncubateurAPITester:
    def __init__(self, base_url="https://pool-campaigns.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test user data for OTP-based auth
        self.test_creator_email = f"creator_test_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_business_email = f"business_test_{datetime.now().strftime('%H%M%S')}@test.com"
        
        self.creator_token = None
        self.business_token = None
        self.creator_user_id = None
        self.business_user_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test": name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if error:
            print(f"    Error: {error}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Test a single API endpoint"""
        url = f"{self.base_url}/api/{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            details = f"Status: {response.status_code}"
            if success and response.content:
                try:
                    json_data = response.json()
                    if isinstance(json_data, dict):
                        details += f", Response keys: {list(json_data.keys())}"
                    elif isinstance(json_data, list):
                        details += f", Response items: {len(json_data)}"
                except:
                    details += ", Non-JSON response"
            
            error = ""
            if not success:
                try:
                    error_data = response.json()
                    error = error_data.get('detail', f'HTTP {response.status_code}')
                except:
                    error = f"HTTP {response.status_code}"
                    
            self.log_test(f"{method} {endpoint} {description}".strip(), success, details, error)
            return success, response
            
        except Exception as e:
            self.log_test(f"{method} {endpoint} {description}".strip(), False, "", str(e))
            return False, None

    def test_platform_stats(self):
        """Test platform statistics endpoint"""
        print("\n🔍 Testing Platform Stats...")
        success, response = self.test_endpoint('GET', 'stats/platform', 200, description="- Platform Stats")
        
        if success and response:
            try:
                data = response.json()
                required_fields = ['creators_count', 'businesses_count', 'projects_count', 'incubator_members']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Platform Stats - Required Fields", False, "", f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Platform Stats - Required Fields", True, f"All required fields present: {required_fields}")
            except Exception as e:
                self.log_test("Platform Stats - JSON Parse", False, "", str(e))

    def test_packs_endpoint(self):
        """Test packs endpoint"""
        print("\n📦 Testing Packs...")
        success, response = self.test_endpoint('GET', 'packs', 200, description="- Get All Packs")
        
        if success and response:
            try:
                packs = response.json()
                if isinstance(packs, list) and len(packs) > 0:
                    pack = packs[0]
                    required_fields = ['pack_id', 'name', 'description', 'price', 'creators_count', 'videos_count']
                    missing_fields = [field for field in required_fields if field not in pack]
                    
                    if missing_fields:
                        self.log_test("Packs - Structure Validation", False, "", f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Packs - Structure Validation", True, f"Pack structure valid, found {len(packs)} packs")
                else:
                    self.log_test("Packs - Data Validation", False, "", "No packs returned or invalid format")
            except Exception as e:
                self.log_test("Packs - JSON Parse", False, "", str(e))

    def test_otp_authentication(self):
        """Test OTP-based authentication flow"""
        print("\n🔐 Testing OTP Authentication...")
        
        # Test OTP request for creator
        otp_request_data = {"email": self.test_creator_email}
        success, response = self.test_endpoint(
            'POST', 'auth/otp/request', 200, 
            data=otp_request_data,
            description="- Request OTP for Creator"
        )
        
        creator_otp_code = None
        if success and response:
            try:
                data = response.json()
                if 'debug_code' in data:
                    creator_otp_code = data['debug_code']
                    self.log_test("OTP Request - Debug Code Received", True, f"Code: {creator_otp_code}")
                else:
                    self.log_test("OTP Request - No Debug Code", False, "", "Debug code not in response")
            except Exception as e:
                self.log_test("OTP Request - Parse Response", False, "", str(e))
        
        # Test OTP verification for creator
        if creator_otp_code:
            otp_verify_data = {"email": self.test_creator_email, "code": creator_otp_code}
            success, response = self.test_endpoint(
                'POST', 'auth/otp/verify', 200,
                data=otp_verify_data,
                description="- Verify OTP for Creator"
            )
            
            if success and response:
                try:
                    data = response.json()
                    if 'token' in data and 'user_id' in data:
                        self.creator_token = data['token']
                        self.creator_user_id = data['user_id']
                        self.log_test("OTP Verify - Creator Token Received", True, f"User ID: {data['user_id']}")
                    else:
                        self.log_test("OTP Verify - Token Missing", False, "", "No token in response")
                except Exception as e:
                    self.log_test("OTP Verify - Parse Response", False, "", str(e))
        
        # Test OTP for business user
        otp_request_data = {"email": self.test_business_email}
        success, response = self.test_endpoint(
            'POST', 'auth/otp/request', 200, 
            data=otp_request_data,
            description="- Request OTP for Business"
        )
        
        business_otp_code = None
        if success and response:
            try:
                data = response.json()
                if 'debug_code' in data:
                    business_otp_code = data['debug_code']
                    self.log_test("OTP Request Business - Debug Code Received", True, f"Code: {business_otp_code}")
            except Exception as e:
                self.log_test("OTP Request Business - Parse Response", False, "", str(e))
        
        # Verify business OTP
        if business_otp_code:
            otp_verify_data = {"email": self.test_business_email, "code": business_otp_code}
            success, response = self.test_endpoint(
                'POST', 'auth/otp/verify', 200,
                data=otp_verify_data,
                description="- Verify OTP for Business"
            )
            
            if success and response:
                try:
                    data = response.json()
                    if 'token' in data and 'user_id' in data:
                        self.business_token = data['token']
                        self.business_user_id = data['user_id']
                        self.log_test("OTP Verify Business - Token Received", True, f"User ID: {data['user_id']}")
                except Exception as e:
                    self.log_test("OTP Verify Business - Parse Response", False, "", str(e))

    def test_user_type_selection(self):
        """Test user type selection after authentication"""
        print("\n👥 Testing User Type Selection...")
        
        if not self.creator_token:
            self.log_test("Type Selection - No Creator Token", False, "", "Creator token not available")
            return
            
        headers = {"Authorization": f"Bearer {self.creator_token}"}
        
        # Set creator type
        type_data = {"user_type": "creator"}
        success, response = self.test_endpoint(
            'POST', 'auth/set-type', 200,
            data=type_data,
            headers=headers,
            description="- Set Creator Type"
        )
        
        if success and response:
            try:
                data = response.json()
                if data.get('user_type') == 'creator':
                    self.log_test("Set Creator Type - Success", True, "User type set to creator")
                else:
                    self.log_test("Set Creator Type - Invalid Response", False, "", f"Unexpected response: {data}")
            except Exception as e:
                self.log_test("Set Creator Type - Parse Response", False, "", str(e))
        
        # Set business type for business user
        if self.business_token:
            headers = {"Authorization": f"Bearer {self.business_token}"}
            type_data = {"user_type": "business"}
            success, response = self.test_endpoint(
                'POST', 'auth/set-type', 200,
                data=type_data,
                headers=headers,
                description="- Set Business Type"
            )
            
            if success and response:
                try:
                    data = response.json()
                    if data.get('user_type') == 'business':
                        self.log_test("Set Business Type - Success", True, "User type set to business")
                except Exception as e:
                    self.log_test("Set Business Type - Parse Response", False, "", str(e))

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n🔒 Testing Authenticated Endpoints...")
        
        if not self.creator_token:
            self.log_test("Auth Endpoints - No Creator Token", False, "", "Creator token not available")
            return
            
        headers = {"Authorization": f"Bearer {self.creator_token}"}
        
        # Test /auth/me
        self.test_endpoint('GET', 'auth/me', 200, headers=headers, description="- Get Current User")
        
        # Test creator profile endpoints
        self.test_endpoint('GET', 'creators/me/profile', 200, headers=headers, description="- Get Creator Profile")
        
        # Test creator stats
        self.test_endpoint('GET', 'stats/creator', 200, headers=headers, description="- Get Creator Stats")
        
        # Test profile update with new scoring system
        update_data = {
            "bio": "Test bio for automated testing of Incubateur des Créateurs",
            "city": "Paris",
            "can_travel": True,
            "works_remote": True,
            "content_types": ["UGC", "Micro-trottoir"],
            "equipment": ["Smartphone", "Caméra"],
            "experience_level": "intermediate",
            "available": True
        }
        self.test_endpoint('PUT', 'creators/me/profile', 200, data=update_data, headers=headers, description="- Update Creator Profile")
        
        # Test trainings endpoint
        self.test_endpoint('GET', 'trainings', 200, headers=headers, description="- Get Trainings")
        
        # Test projects endpoint
        self.test_endpoint('GET', 'projects', 200, headers=headers, description="- Get Projects")
        
        # Test incubator info
        self.test_endpoint('GET', 'incubator/info', 200, description="- Get Incubator Info")

    def test_creators_endpoint(self):
        """Test creators browsing endpoint"""
        print("\n👥 Testing Creators Endpoint...")
        
        # Test get all creators
        success, response = self.test_endpoint('GET', 'creators', 200, description="- Get All Creators")
        
        if success and response:
            try:
                creators = response.json()
                if isinstance(creators, list):
                    self.log_test("Creators - List Format", True, f"Found {len(creators)} creators")
                    
                    # Test with filters
                    self.test_endpoint('GET', 'creators?city=Paris', 200, description="- Filter by City")
                    self.test_endpoint('GET', 'creators?available=true', 200, description="- Filter by Availability")
                    self.test_endpoint('GET', 'creators?limit=5', 200, description="- Limit Results")
                else:
                    self.log_test("Creators - Invalid Format", False, "", "Response is not a list")
            except Exception as e:
                self.log_test("Creators - Parse Response", False, "", str(e))

    def test_business_endpoints(self):
        """Test business-specific endpoints"""
        print("\n🏢 Testing Business Endpoints...")
        
        if not self.business_token:
            self.log_test("Business Endpoints - No Token", False, "", "Business token not available")
            return
            
        headers = {"Authorization": f"Bearer {self.business_token}"}
        
        # Test business profile
        self.test_endpoint('GET', 'business/me/profile', 200, headers=headers, description="- Get Business Profile")
        
        # Test business stats
        self.test_endpoint('GET', 'stats/business', 200, headers=headers, description="- Get Business Stats")
        
        # Test pack selection
        pack_data = {"pack_id": "pack_starter"}
        self.test_endpoint('POST', 'business/select-pack', 200, data=pack_data, headers=headers, description="- Select Pack")
        
        # Test project creation (should work after pack selection)
        project_data = {
            "pack_id": "pack_starter",
            "title": "Test Project",
            "description": "Test project for automated testing",
            "budget": 500,
            "content_type": "UGC",
            "target_creators": 1
        }
        self.test_endpoint('POST', 'projects', 200, data=project_data, headers=headers, description="- Create Project")

    def test_access_request(self):
        """Test access request functionality"""
        print("\n💬 Testing Access Request...")
        
        access_data = {
            "name": "Test User",
            "email": "test@example.com",
            "reason": "Test access request for automated testing"
        }
        
        self.test_endpoint('POST', 'auth/request-access', 200, data=access_data, description="- Submit Access Request")

    def test_error_handling(self):
        """Test error handling"""
        print("\n⚠️  Testing Error Handling...")
        
        # Test invalid endpoints
        self.test_endpoint('GET', 'invalid-endpoint', 404, description="- Invalid Endpoint")
        
        # Test invalid OTP
        invalid_otp = {
            "email": "invalid@test.com",
            "code": "000000"
        }
        self.test_endpoint('POST', 'auth/otp/verify', 400, data=invalid_otp, description="- Invalid OTP")
        
        # Test unauthorized access
        self.test_endpoint('GET', 'auth/me', 401, description="- Unauthorized Access")
        
        # Test invalid user type
        if self.creator_token:
            headers = {"Authorization": f"Bearer {self.creator_token}"}
            invalid_type = {"user_type": "invalid"}
            self.test_endpoint('POST', 'auth/set-type', 400, data=invalid_type, headers=headers, description="- Invalid User Type")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Incubateur des Créateurs API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            # Public endpoints
            self.test_platform_stats()
            self.test_packs_endpoint()
            self.test_creators_endpoint()
            
            # Authentication flow
            self.test_otp_authentication()
            self.test_user_type_selection()
            
            # Authenticated endpoints
            self.test_authenticated_endpoints()
            self.test_business_endpoints()
            
            # Other functionality
            self.test_access_request()
            
            # Error handling
            self.test_error_handling()
            
        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = IncubateurAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': tester.tests_run - tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())