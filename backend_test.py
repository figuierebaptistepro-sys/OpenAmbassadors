#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class IncubateurAPITester:
    def __init__(self, base_url="https://ugc-machine.preview.emergentagent.com"):
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

    def test_user_registration(self):
        """Test user registration for both creator and business"""
        print("\n👤 Testing User Registration...")
        
        # Test creator registration
        success, response = self.test_endpoint(
            'POST', 'auth/register', 200, 
            data=self.test_creator,
            description="- Creator Registration"
        )
        
        if success and response:
            try:
                data = response.json()
                if 'token' in data and 'user_id' in data:
                    self.creator_token = data['token']
                    self.log_test("Creator Registration - Token Received", True, f"User ID: {data['user_id']}")
                else:
                    self.log_test("Creator Registration - Token Missing", False, "", "No token in response")
            except Exception as e:
                self.log_test("Creator Registration - Parse Response", False, "", str(e))
        
        # Test business registration
        success, response = self.test_endpoint(
            'POST', 'auth/register', 200,
            data=self.test_business,
            description="- Business Registration"
        )
        
        if success and response:
            try:
                data = response.json()
                if 'token' in data and 'user_id' in data:
                    self.business_token = data['token']
                    self.log_test("Business Registration - Token Received", True, f"User ID: {data['user_id']}")
                else:
                    self.log_test("Business Registration - Token Missing", False, "", "No token in response")
            except Exception as e:
                self.log_test("Business Registration - Parse Response", False, "", str(e))

    def test_user_login(self):
        """Test user login"""
        print("\n🔐 Testing User Login...")
        
        # Test creator login
        login_data = {
            "email": self.test_creator["email"],
            "password": self.test_creator["password"]
        }
        
        success, response = self.test_endpoint(
            'POST', 'auth/login', 200,
            data=login_data,
            description="- Creator Login"
        )
        
        if success and response:
            try:
                data = response.json()
                if 'token' in data:
                    self.log_test("Creator Login - Token Received", True, f"User type: {data.get('user_type')}")
                else:
                    self.log_test("Creator Login - Token Missing", False, "", "No token in response")
            except Exception as e:
                self.log_test("Creator Login - Parse Response", False, "", str(e))

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
        
        # Test profile update
        update_data = {
            "bio": "Test bio for automated testing",
            "city": "Paris",
            "available": True
        }
        self.test_endpoint('PUT', 'creators/me/profile', 200, data=update_data, headers=headers, description="- Update Creator Profile")

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
        
        # Test campaigns
        self.test_endpoint('GET', 'campaigns', 200, headers=headers, description="- Get Campaigns")

    def test_quote_request(self):
        """Test quote request functionality"""
        print("\n💬 Testing Quote Request...")
        
        quote_data = {
            "company_name": "Test Company",
            "email": "test@company.com",
            "phone": "0123456789",
            "pack_id": "pack_local_impact",
            "message": "Test quote request"
        }
        
        self.test_endpoint('POST', 'quote-request', 200, data=quote_data, description="- Submit Quote Request")

    def test_error_handling(self):
        """Test error handling"""
        print("\n⚠️  Testing Error Handling...")
        
        # Test invalid endpoints
        self.test_endpoint('GET', 'invalid-endpoint', 404, description="- Invalid Endpoint")
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        self.test_endpoint('POST', 'auth/login', 401, data=invalid_login, description="- Invalid Login")
        
        # Test duplicate registration
        self.test_endpoint('POST', 'auth/register', 400, data=self.test_creator, description="- Duplicate Registration")
        
        # Test unauthorized access
        self.test_endpoint('GET', 'auth/me', 401, description="- Unauthorized Access")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting UGC Machine API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            # Public endpoints
            self.test_platform_stats()
            self.test_packs_endpoint()
            self.test_creators_endpoint()
            
            # Authentication
            self.test_user_registration()
            self.test_user_login()
            
            # Authenticated endpoints
            self.test_authenticated_endpoints()
            self.test_business_endpoints()
            
            # Other functionality
            self.test_quote_request()
            
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
    tester = UGCMachineAPITester()
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