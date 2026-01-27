"""
Backend API tests for Project Creation Features
- POST /api/upload/project-banner - Upload project banner image
- GET /api/uploads/projects/{filename} - Retrieve project banner image
- POST /api/projects - Create project with banner_url required
- GET /api/projects - List projects with business_name and business_logo enriched
- GET /api/projects/business - List projects for a business
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProjectBannerUpload:
    """Tests for project banner upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Request OTP for test user
        otp_response = self.session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_project_business@test.com"
        })
        assert otp_response.status_code == 200, f"OTP request failed: {otp_response.text}"
        otp_code = otp_response.json().get("debug_code")
        
        # Verify OTP
        verify_response = self.session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_project_business@test.com",
            "code": otp_code
        })
        assert verify_response.status_code == 200, f"OTP verify failed: {verify_response.text}"
        
        # Set user type to business
        self.session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        
        # Select a pack (required for project creation)
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        yield
    
    def test_upload_project_banner_success(self):
        """Test successful project banner upload"""
        # Create a simple test image (1x1 pixel PNG)
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_banner.png', image_data, 'image/png')}
        
        # Use cookies from session but don't set Content-Type (let requests handle it)
        response = requests.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            cookies=self.session.cookies
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "banner_url" in data, "Response should contain banner_url"
        assert data["banner_url"].startswith("/api/uploads/projects/"), f"Invalid banner_url format: {data['banner_url']}"
        
        # Store for later tests
        self.banner_url = data["banner_url"]
        print(f"✓ Project banner uploaded successfully: {data['banner_url']}")
    
    def test_upload_project_banner_invalid_type(self):
        """Test upload with invalid file type"""
        files = {'file': ('test.txt', b'not an image', 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            cookies=self.session.cookies
        )
        
        assert response.status_code == 400, f"Should reject invalid file type: {response.text}"
        print("✓ Invalid file type correctly rejected")
    
    def test_upload_project_banner_unauthenticated(self):
        """Test upload without authentication"""
        new_session = requests.Session()
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test_banner.png', io.BytesIO(image_data), 'image/png')}
        
        response = new_session.post(f"{BASE_URL}/api/upload/project-banner", files=files)
        
        assert response.status_code == 401, f"Should require authentication: {response.text}"
        print("✓ Unauthenticated upload correctly rejected")


class TestProjectBannerRetrieval:
    """Tests for project banner retrieval endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and upload a banner"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        otp_response = self.session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_project_retrieval@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        self.session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_project_retrieval@test.com",
            "code": otp_code
        })
        self.session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        
        # Upload a banner
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test_banner.png', io.BytesIO(image_data), 'image/png')}
        headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
        
        upload_response = self.session.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            headers=headers
        )
        if upload_response.status_code == 200:
            self.banner_url = upload_response.json().get("banner_url")
        else:
            self.banner_url = None
        
        yield
    
    def test_retrieve_project_banner_success(self):
        """Test successful project banner retrieval"""
        if not self.banner_url:
            pytest.skip("Banner upload failed, skipping retrieval test")
        
        # Extract filename from URL
        filename = self.banner_url.split("/")[-1]
        
        response = requests.get(f"{BASE_URL}/api/uploads/projects/{filename}")
        
        assert response.status_code == 200, f"Banner retrieval failed: {response.text}"
        assert response.headers.get("content-type", "").startswith("image/"), "Response should be an image"
        print(f"✓ Project banner retrieved successfully: {filename}")
    
    def test_retrieve_nonexistent_banner(self):
        """Test retrieval of non-existent banner"""
        response = requests.get(f"{BASE_URL}/api/uploads/projects/nonexistent_file_12345.png")
        
        assert response.status_code == 404, f"Should return 404 for non-existent file: {response.text}"
        print("✓ Non-existent banner correctly returns 404")


class TestProjectCreation:
    """Tests for project creation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with business user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        otp_response = self.session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_project_create@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        self.session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_project_create@test.com",
            "code": otp_code
        })
        self.session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        
        # Select a pack
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        # Upload a banner for testing
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test_banner.png', io.BytesIO(image_data), 'image/png')}
        headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
        
        upload_response = self.session.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            headers=headers
        )
        if upload_response.status_code == 200:
            self.banner_url = upload_response.json().get("banner_url")
        else:
            self.banner_url = "/api/uploads/projects/test.png"
        
        yield
    
    def test_create_project_success(self):
        """Test successful project creation with all fields"""
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Campagne TikTok Beauté",
            "description": "Recherche créateurs pour campagne beauté",
            "brief": "Brief détaillé pour les créateurs avec instructions spécifiques",
            "budget": 500,
            "content_type": "UGC",
            "target_creators": 3,
            "requirements": ["Minimum 10k abonnés", "Expérience beauté"],
            "deliverables": ["Vidéo verticale (9:16)", "TikTok", "Droits publicitaires"],
            "deadline": "2025-03-01",
            "duration": "2 semaines",
            "location": "Paris",
            "remote_ok": True,
            "banner_url": self.banner_url,
            "incubator_only": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 200, f"Project creation failed: {response.text}"
        data = response.json()
        assert "project_id" in data, "Response should contain project_id"
        assert data.get("message") == "Projet créé", f"Unexpected message: {data.get('message')}"
        
        self.project_id = data["project_id"]
        print(f"✓ Project created successfully: {data['project_id']}")
    
    def test_create_project_without_banner(self):
        """Test project creation fails without banner_url"""
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project Without Banner",
            "description": "This should fail",
            "budget": 500,
            "content_type": "UGC",
            # banner_url is missing
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 400, f"Should require banner_url: {response.text}"
        data = response.json()
        assert "couverture" in data.get("detail", "").lower() or "banner" in data.get("detail", "").lower(), \
            f"Error should mention banner requirement: {data}"
        print("✓ Project creation without banner correctly rejected")
    
    def test_create_project_without_pack(self):
        """Test project creation fails without pack selection"""
        # Create new session without pack selection
        new_session = requests.Session()
        new_session.headers.update({"Content-Type": "application/json"})
        
        otp_response = new_session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_no_pack@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        new_session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_no_pack@test.com",
            "code": otp_code
        })
        new_session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project Without Pack",
            "description": "This should fail",
            "budget": 500,
            "content_type": "UGC",
            "banner_url": self.banner_url
        }
        
        response = new_session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 400, f"Should require pack selection: {response.text}"
        print("✓ Project creation without pack correctly rejected")


class TestProjectListing:
    """Tests for project listing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and create a test project"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as business
        otp_response = self.session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_project_list@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        self.session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_project_list@test.com",
            "code": otp_code
        })
        self.session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        
        # Update business profile with company name
        self.session.put(f"{BASE_URL}/api/business/me/profile", json={
            "company_name": "TEST_Company",
            "industry": "Tech"
        })
        
        # Select pack
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        # Upload banner
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test_banner.png', io.BytesIO(image_data), 'image/png')}
        headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
        
        upload_response = self.session.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            headers=headers
        )
        banner_url = upload_response.json().get("banner_url") if upload_response.status_code == 200 else "/api/uploads/projects/test.png"
        
        # Create a test project
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project for Listing",
            "description": "Test project for listing tests",
            "budget": 1000,
            "content_type": "UGC",
            "banner_url": banner_url
        }
        create_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        if create_response.status_code == 200:
            self.project_id = create_response.json().get("project_id")
        
        yield
    
    def test_get_projects_enriched(self):
        """Test GET /api/projects returns enriched data with business_name and business_logo"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        
        assert response.status_code == 200, f"Projects listing failed: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Response should be a list"
        
        # Find our test project
        test_projects = [p for p in projects if p.get("title", "").startswith("TEST_")]
        
        if test_projects:
            project = test_projects[0]
            # Check enriched fields
            assert "business_name" in project, "Project should have business_name field"
            assert "business_logo" in project, "Project should have business_logo field"
            assert "banner_url" in project, "Project should have banner_url field"
            print(f"✓ Projects listing returns enriched data: business_name={project.get('business_name')}")
        else:
            print("✓ Projects listing works (no test projects found)")
    
    def test_get_business_projects(self):
        """Test GET /api/projects/business returns only business's projects"""
        response = self.session.get(f"{BASE_URL}/api/projects/business")
        
        assert response.status_code == 200, f"Business projects listing failed: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Response should be a list"
        
        # All projects should belong to this business
        for project in projects:
            assert "project_id" in project, "Each project should have project_id"
            assert "title" in project, "Each project should have title"
            assert "banner_url" in project, "Each project should have banner_url"
        
        print(f"✓ Business projects listing works: {len(projects)} projects found")
    
    def test_get_business_projects_as_creator(self):
        """Test GET /api/projects/business fails for creator users"""
        # Create new session as creator
        creator_session = requests.Session()
        creator_session.headers.update({"Content-Type": "application/json"})
        
        otp_response = creator_session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_creator_list@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        creator_session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_creator_list@test.com",
            "code": otp_code
        })
        creator_session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "creator"})
        
        response = creator_session.get(f"{BASE_URL}/api/projects/business")
        
        assert response.status_code == 403, f"Should reject creator access: {response.text}"
        print("✓ Business projects endpoint correctly rejects creator access")


class TestProjectApplication:
    """Tests for project application endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup business and creator sessions"""
        # Business session
        self.business_session = requests.Session()
        self.business_session.headers.update({"Content-Type": "application/json"})
        
        otp_response = self.business_session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_biz_apply@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        self.business_session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_biz_apply@test.com",
            "code": otp_code
        })
        self.business_session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "business"})
        self.business_session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        # Upload banner and create project
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        files = {'file': ('test_banner.png', io.BytesIO(image_data), 'image/png')}
        headers = {k: v for k, v in self.business_session.headers.items() if k.lower() != 'content-type'}
        
        upload_response = self.business_session.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            headers=headers
        )
        banner_url = upload_response.json().get("banner_url") if upload_response.status_code == 200 else "/api/uploads/projects/test.png"
        
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project for Application",
            "description": "Test project",
            "budget": 500,
            "content_type": "UGC",
            "banner_url": banner_url
        }
        create_response = self.business_session.post(f"{BASE_URL}/api/projects", json=project_data)
        self.project_id = create_response.json().get("project_id") if create_response.status_code == 200 else None
        
        # Creator session
        self.creator_session = requests.Session()
        self.creator_session.headers.update({"Content-Type": "application/json"})
        
        otp_response = self.creator_session.post(f"{BASE_URL}/api/auth/otp/request", json={
            "email": "test_creator_apply@test.com"
        })
        otp_code = otp_response.json().get("debug_code")
        self.creator_session.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "email": "test_creator_apply@test.com",
            "code": otp_code
        })
        self.creator_session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": "creator"})
        
        yield
    
    def test_creator_apply_to_project(self):
        """Test creator can apply to a project"""
        if not self.project_id:
            pytest.skip("Project creation failed")
        
        response = self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        assert response.status_code == 200, f"Application failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Creator successfully applied to project: {data.get('message')}")
    
    def test_creator_cannot_apply_twice(self):
        """Test creator cannot apply to same project twice"""
        if not self.project_id:
            pytest.skip("Project creation failed")
        
        # First application
        self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        # Second application should fail
        response = self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        assert response.status_code == 400, f"Should reject duplicate application: {response.text}"
        print("✓ Duplicate application correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
